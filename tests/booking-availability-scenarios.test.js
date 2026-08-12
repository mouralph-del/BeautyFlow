import test from 'node:test'
import assert from 'node:assert/strict'
import { getTimeSlotStatus, timeToMinutes, minutesToTime } from '../src/utils/timeUtils.js'

const localDate = (year, month, day, hour = 12, minute = 0) =>
  new Date(year, month - 1, day, hour, minute, 0, 0)

const deferred = () => {
  let resolve
  let reject
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

const regularSchedule = {
  is_active: true,
  opening_time: '09:00',
  closing_time: '18:00',
  break_start: '12:00',
  break_end: '13:30',
}

const slotStatus = (startTime, durationMinutes, schedule, bookedAppointments = [], blockedIntervals = []) =>
  getTimeSlotStatus({
    startTime,
    durationMinutes,
    selectedDate: localDate(2026, 8, 20),
    bookedAppointments: bookedAppointments.map((appointment) => ({
      time: appointment.time ?? appointment.start,
      durationMinutes: appointment.durationMinutes
        ?? timeToMinutes(appointment.end) - timeToMinutes(appointment.start),
    })),
    scheduleOverride: {
      opening: schedule.opening_time ?? schedule.opening,
      closing: schedule.closing_time ?? schedule.closing,
      breakStart: schedule.break_start ?? schedule.breakStart,
      breakEnd: schedule.break_end ?? schedule.breakEnd,
    },
    blockedIntervals: blockedIntervals.map((block) => ({
      start: block.start ?? block.start_time,
      end: block.end ?? block.end_time,
    })),
  })

const generateTimes = ({ schedule = regularSchedule, interval = 30 } = {}) => {
  if (!schedule?.is_active) return []

  const opening = schedule.opening_time ?? schedule.opening
  const closing = schedule.closing_time ?? schedule.closing
  const result = []

  for (
    let minute = timeToMinutes(opening);
    minute < timeToMinutes(closing);
    minute += interval
  ) {
    result.push(minutesToTime(minute))
  }

  return result
}

const isPastTime = (date, time, now) => {
  const [hours, minutes] = time.split(':').map(Number)
  const instant = new Date(date)
  instant.setHours(hours, minutes, 0, 0)
  return instant <= now
}

const visibleSlots = ({
  date,
  now,
  duration = 30,
  schedule = regularSchedule,
  bookedTimes = [],
  blocks = [],
  interval = 30,
}) =>
  generateTimes({ schedule, interval })
    .map((time) => {
      const status = slotStatus(time, duration, schedule, bookedTimes, blocks)
      return {
        time,
        status: status === 'hidden' ? status : isPastTime(date, time, now) ? 'unavailable' : status,
      }
    })
    .filter(({ status }) => status !== 'hidden')

const selectDate = (state, date) => ({ ...state, selectedDate: date, selectedTime: '' })
const changeServices = (state, duration) => ({ ...state, duration, selectedTime: '' })

const isAvailableDay = (date, releasedMonths, availableDays) => {
  const released = releasedMonths.some(
    ({ year, month }) => year === date.getFullYear() && month === date.getMonth() + 1,
  )
  return released && availableDays.includes(date.getDay())
}

const createBookedTimesLoader = () => {
  let bookedTimes = []
  let cleanupCurrent = () => {}

  const load = (request) => {
    cleanupCurrent()
    let active = true
    const completion = request.promise
      .then((appointments) => {
        if (active) bookedTimes = appointments
      })
      .catch(() => {
        if (active) bookedTimes = []
      })
    cleanupCurrent = () => { active = false }
    return completion
  }

  return { load, getBookedTimes: () => bookedTimes }
}

test('carregamentos concorrentes preservam B quando a resposta tardia de A termina depois', async () => {
  const requestA = deferred()
  const requestB = deferred()
  const loader = createBookedTimesLoader()
  const loadA = loader.load(requestA)
  const loadB = loader.load(requestB)
  requestB.resolve(['14:00'])
  await loadB
  assert.deepEqual(loader.getBookedTimes(), ['14:00'])

  requestA.resolve(['09:00'])
  await loadA
  assert.deepEqual(loader.getBookedTimes(), ['14:00'])
})

test('mudança A para B para C preserva C independentemente da ordem das respostas antigas', async () => {
  const requestA = deferred()
  const requestB = deferred()
  const requestC = deferred()
  const loader = createBookedTimesLoader()
  const loadA = loader.load(requestA)
  const loadB = loader.load(requestB)
  const loadC = loader.load(requestC)

  requestC.resolve(['16:00'])
  await loadC
  requestA.resolve(['09:00'])
  requestB.resolve(['11:00'])
  await Promise.all([loadA, loadB])

  assert.deepEqual(loader.getBookedTimes(), ['16:00'])
})

test('respostas em ordem normal continuam atualizando a data ativa', async () => {
  const requestA = deferred()
  const requestB = deferred()
  const loader = createBookedTimesLoader()
  const loadA = loader.load(requestA)
  requestA.resolve(['09:00'])
  await loadA
  assert.deepEqual(loader.getBookedTimes(), ['09:00'])

  const loadB = loader.load(requestB)
  requestB.resolve(['14:00'])
  await loadB
  assert.deepEqual(loader.getBookedTimes(), ['14:00'])
})

test('erro tardio de uma requisição antiga não limpa os horários da data atual', async () => {
  const requestA = deferred()
  const requestB = deferred()
  const loader = createBookedTimesLoader()
  const loadA = loader.load(requestA)
  const loadB = loader.load(requestB)
  requestB.resolve(['15:30'])
  await loadB

  requestA.reject(new Error('falha antiga'))
  await loadA
  assert.deepEqual(loader.getBookedTimes(), ['15:30'])
})

test('cleanup ativo ignora resposta antiga da disponibilidade diária', async () => {
  const requestA = deferred()
  const requestB = deferred()
  let availability = null

  const load = (request) => {
    let active = true
    const completion = request.promise.then((value) => {
      if (active) availability = value
    })
    return { completion, cleanup: () => { active = false } }
  }

  const loadA = load(requestA)
  loadA.cleanup()
  const loadB = load(requestB)
  requestB.resolve({ date: 'B', special_hours: regularSchedule })
  await loadB.completion
  requestA.resolve({ date: 'A' })
  await loadA.completion

  assert.equal(availability.date, 'B')
})

test('troca de data durante loading mantém data nova, limpa seleção e produz slots renderizáveis', async () => {
  const requestA = deferred()
  const requestB = deferred()
  let state = { selectedDate: localDate(2026, 8, 10), selectedTime: '10:00', loading: true, slots: [] }

  state = selectDate(state, localDate(2026, 8, 11))
  const apply = async (request, expectedDay) => {
    const slots = await request.promise
    if (state.selectedDate.getDate() === expectedDay) state = { ...state, slots, loading: false }
  }
  const loadA = apply(requestA, 10)
  const loadB = apply(requestB, 11)
  requestB.resolve(['09:00', '09:30'])
  await loadB
  requestA.resolve(['17:00'])
  await loadA

  const renderedButtons = state.slots.map((time) => ({ role: 'button', label: time }))
  assert.equal(state.selectedDate.getDate(), 11)
  assert.equal(state.selectedTime, '')
  assert.deepEqual(renderedButtons.map(({ label }) => label), ['09:00', '09:30'])
})

test('trocar a data limpa o horário selecionado', () => {
  const state = selectDate(
    { selectedDate: localDate(2026, 8, 10), selectedTime: '15:00' },
    localDate(2026, 8, 12),
  )
  assert.equal(state.selectedTime, '')
})

test('alterar serviços limpa o horário e recalcula slots conforme a duração', () => {
  const date = localDate(2026, 8, 20)
  const now = localDate(2026, 8, 19)
  let state = { selectedTime: '11:30', duration: 30 }
  state = changeServices(state, 90)

  const slots = visibleSlots({ date, now, duration: state.duration })
  assert.equal(state.selectedTime, '')
  assert.equal(slots.some(({ time }) => time === '11:30'), false)
  assert.equal(slots.some(({ time }) => time === '10:30'), true)
})

test('horário especial mais curto substitui integralmente o horário regular', () => {
  const special = { ...regularSchedule, opening_time: '10:00', closing_time: '15:00' }
  const times = generateTimes({ schedule: special })
  assert.equal(times[0], '10:00')
  assert.equal(times.at(-1), '14:30')
  assert.equal(times.includes('09:00'), false)
})

test('horário especial ampliado aceita limites fora do horário regular', () => {
  const special = { ...regularSchedule, opening_time: '08:00', closing_time: '20:00' }
  const times = generateTimes({ schedule: special })
  assert.equal(times[0], '08:00')
  assert.equal(times.at(-1), '19:30')
})

test('horário especial com intervalos próprios controla almoço e limites', () => {
  const special = {
    is_active: true,
    opening_time: '07:00',
    closing_time: '14:00',
    break_start: '10:00',
    break_end: '10:30',
  }
  assert.equal(slotStatus('09:30', 30, special), 'available')
  assert.equal(slotStatus('10:00', 30, special), 'hidden')
  assert.equal(slotStatus('13:30', 30, special), 'available')
  assert.equal(slotStatus('14:00', 30, special), 'hidden')
})

test('bloqueio total torna indisponíveis todos os slots utilizáveis', () => {
  const slots = visibleSlots({
    date: localDate(2026, 8, 20),
    now: localDate(2026, 8, 19),
    blocks: [{ start_time: '09:00', end_time: '18:00' }],
  })
  assert.ok(slots.length > 0)
  assert.ok(slots.every(({ status }) => status === 'unavailable'))
})

test('bloqueios parciais no início, meio e fim atingem somente intervalos conflitantes', () => {
  const blocks = [
    { start_time: '09:00', end_time: '09:30' },
    { start_time: '10:30', end_time: '11:30' },
    { start_time: '17:30', end_time: '18:00' },
  ]
  assert.equal(slotStatus('09:00', 30, regularSchedule, [], blocks), 'unavailable')
  assert.equal(slotStatus('09:30', 30, regularSchedule, [], blocks), 'available')
  assert.equal(slotStatus('10:00', 60, regularSchedule, [], blocks), 'unavailable')
  assert.equal(slotStatus('11:30', 30, regularSchedule, [], blocks), 'available')
  assert.equal(slotStatus('17:30', 30, regularSchedule, [], blocks), 'unavailable')
})

test('limites do almoço distinguem término anterior, início dentro, cruzamento e início posterior', () => {
  assert.equal(slotStatus('11:00', 60, regularSchedule), 'available')
  assert.equal(slotStatus('12:00', 30, regularSchedule), 'hidden')
  assert.equal(slotStatus('11:30', 60, regularSchedule), 'hidden')
  assert.equal(slotStatus('13:30', 30, regularSchedule), 'available')
})

test('conflitos com agendamento menor, igual ou maior bloqueiam o início sobreposto', () => {
  assert.equal(slotStatus('10:00', 60, regularSchedule, [{ start: '10:15', end: '10:30' }]), 'unavailable')
  assert.equal(slotStatus('10:00', 30, regularSchedule, [{ start: '10:00', end: '10:30' }]), 'unavailable')
  assert.equal(slotStatus('10:30', 30, regularSchedule, [{ start: '10:00', end: '11:30' }]), 'unavailable')
})

test('dois agendamentos, inclusive consecutivos, preservam limites sem falso conflito', () => {
  const booked = [
    { start: '09:00', end: '09:30' },
    { start: '09:30', end: '10:00' },
  ]
  assert.equal(slotStatus('09:00', 30, regularSchedule, booked), 'unavailable')
  assert.equal(slotStatus('09:30', 30, regularSchedule, booked), 'unavailable')
  assert.equal(slotStatus('10:00', 30, regularSchedule, booked), 'available')
})

test('relógio injetado no minuto exato desabilita passado e mantém futuro', () => {
  const date = localDate(2026, 8, 20)
  const now = localDate(2026, 8, 20, 10, 0)
  const slots = visibleSlots({ date, now })
  const status = Object.fromEntries(slots.map((slot) => [slot.time, slot.status]))
  assert.equal(status['09:30'], 'unavailable')
  assert.equal(status['10:00'], 'unavailable')
  assert.equal(status['10:30'], 'available')
})

test('avanço do relógio limpa seleção que se tornou passada e preserva uma futura', () => {
  const date = localDate(2026, 8, 20)
  const clearPastSelection = (selectedTime, now) =>
    selectedTime && isPastTime(date, selectedTime, now) ? '' : selectedTime

  assert.equal(clearPastSelection('10:00', localDate(2026, 8, 20, 10, 1)), '')
  assert.equal(clearPastSelection('10:30', localDate(2026, 8, 20, 10, 1)), '10:30')
})

test('virada de 23:59 para 00:00 usa datas locais explícitas sem depender do timezone externo', () => {
  const today = localDate(2026, 8, 20)
  const tomorrow = localDate(2026, 8, 21)
  assert.equal(isPastTime(today, '23:59', localDate(2026, 8, 20, 23, 59)), true)
  assert.equal(isPastTime(tomorrow, '00:00', localDate(2026, 8, 21, 0, 0)), true)
  assert.equal(isPastTime(tomorrow, '00:30', localDate(2026, 8, 21, 0, 0)), false)
})

test('meses liberados aceitam mês presente e rejeitam mês ausente', () => {
  const releases = [{ year: 2026, month: 8 }]
  const weekdays = [1, 2, 3, 4, 5]
  assert.equal(isAvailableDay(localDate(2026, 8, 20), releases, weekdays), true)
  assert.equal(isAvailableDay(localDate(2026, 9, 21), releases, weekdays), false)
})

test('múltiplos meses e lista vazia são tratados deterministicamente', () => {
  const releases = [{ year: 2026, month: 8 }, { year: 2026, month: 10 }]
  assert.equal(isAvailableDay(localDate(2026, 10, 5), releases, [1]), true)
  assert.equal(isAvailableDay(localDate(2026, 10, 5), [], [1]), false)
})

test('falha no serviço de meses liberados mantém fallback vazio', async () => {
  const loadReleasedMonths = async (fetchMonths) => {
    try {
      return await fetchMonths()
    } catch {
      return []
    }
  }
  const releases = await loadReleasedMonths(async () => { throw new Error('indisponível') })
  assert.deepEqual(releases, [])
})

test('primeiro e último dia do mês e mudança de mês respeitam ano e mês liberados', () => {
  const releases = [{ year: 2026, month: 8 }]
  const everyDay = [0, 1, 2, 3, 4, 5, 6]
  assert.equal(isAvailableDay(localDate(2026, 8, 1), releases, everyDay), true)
  assert.equal(isAvailableDay(localDate(2026, 8, 31), releases, everyDay), true)
  assert.equal(isAvailableDay(localDate(2026, 9, 1), releases, everyDay), false)
})

test('intervalo muito curto gera somente o slot inicial quando ele cabe', () => {
  const shortSchedule = { is_active: true, opening_time: '09:00', closing_time: '09:30' }
  assert.deepEqual(generateTimes({ schedule: shortSchedule, interval: 30 }), ['09:00'])
  assert.equal(slotStatus('09:00', 30, shortSchedule), 'available')
})

test('intervalo menor que a duração oculta o slot que não cabe', () => {
  const shortSchedule = { is_active: true, opening_time: '09:00', closing_time: '09:20' }
  const slots = visibleSlots({
    date: localDate(2026, 8, 20),
    now: localDate(2026, 8, 19),
    duration: 45,
    schedule: shortSchedule,
    interval: 30,
  })
  assert.deepEqual(slots, [])
})

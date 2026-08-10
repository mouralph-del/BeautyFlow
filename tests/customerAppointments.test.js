import { strict as assert } from 'assert';
import { getAppointmentImage } from '../src/utils/customerAppointments.js';

globalThis.Deno = undefined; // avoid Deno env in node test runner

const sample = { services:[{image_url:'https://example.com/service.jpg',name:'Teste'}], image_url:'https://example.com/appointment.jpg', serviceName:'Microblading' };

assert.equal(getAppointmentImage(sample), 'https://example.com/service.jpg');

const sample2 = { services:[], image_url:'https://example.com/appointment.jpg', serviceName:'Design com Henna' };
assert.equal(getAppointmentImage(sample2), 'https://example.com/appointment.jpg');

const sample3 = { services:[], image_url:null, serviceName:'Microblading' };
const result3 = getAppointmentImage(sample3);
assert.ok(result3 && typeof result3 === 'string', 'Should return a fallback studio image for known names');


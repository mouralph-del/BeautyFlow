import fs from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";
import { orderedGalleryServices, promotionForService, resolveGalleryCopy } from "../src/utils/galleryPresentation.js";

const gallery=fs.readFileSync("src/components/GalleryCarousel/GalleryCarousel.jsx","utf8");
const page=fs.readFileSync("src/pages/Gallery.jsx","utf8");
const admin=fs.readFileSync("src/pages/AdminGallery.jsx","utf8");
const migration=fs.readFileSync("supabase/migrations/20260804700000_gallery_media_multiple_services.sql","utf8");
const services=[{dbId:1,id:11,title:"Design",description:"Descrição principal",active:true},{dbId:2,id:12,title:"Henna",description:"Descrição henna",active:true},{dbId:3,id:13,title:"Inativo",active:false}];

test("migration é aditiva, idempotente, protegida e preserva vínculo legado",()=>{assert.match(migration,/create table if not exists public\.gallery_media_services/);assert.match(migration,/on conflict \(gallery_media_id, service_id\) do nothing/);assert.match(migration,/information_schema\.columns/);assert.match(migration,/public\.is_admin\(\)/);assert.doesNotMatch(migration,/drop table|drop column|truncate/i);});
test("mídia aceita zero, um ou vários serviços em ordem e filtra inativos",()=>{assert.deepEqual(orderedGalleryServices({},services),[]);const relations=orderedGalleryServices({serviceRelations:[{serviceId:2,displayOrder:2},{serviceId:3,displayOrder:1},{serviceId:1,displayOrder:0,isPrimary:true}]},services);assert.deepEqual(relations.map((item)=>item.service.title),["Design","Henna"]);});
test("título automático combina vários serviços e aceita personalizado e fallback",()=>{const relations=orderedGalleryServices({serviceRelations:[{serviceId:1,isPrimary:true},{serviceId:2}]},services);assert.equal(resolveGalleryCopy({},relations).title,"Design + Henna");assert.equal(resolveGalleryCopy({titleSource:"combined"},relations).title,"Design + Henna");assert.equal(resolveGalleryCopy({titleSource:"custom",customTitle:"Olhar completo"},relations).title,"Olhar completo");assert.equal(resolveGalleryCopy({title:"Resultado"},[]).title,"Resultado");});
test("descrição nunca concatena serviços",()=>{const relations=orderedGalleryServices({serviceRelations:[{serviceId:1,isPrimary:true},{serviceId:2}]},services);assert.equal(resolveGalleryCopy({},relations).description,"Descrição principal");assert.equal(resolveGalleryCopy({descriptionSource:"custom",customDescription:"Texto próprio"},relations).description,"Texto próprio");});
test("promoção é relacionada pelo id oficial do catálogo",()=>{const promotion={id:"p",service_ids:[2]};assert.equal(promotionForService(services[1],[promotion]),promotion);assert.equal(promotionForService(services[0],[promotion]),null);});
test("integração não cria preço, duração ou desconto na galeria",()=>{assert.match(page,/gallery_media_services/);assert.match(admin,/Serviços relacionados/);assert.match(admin,/Informações exibidas ao cliente/);assert.match(gallery,/calculatePromotion\(service\.priceValue,\s*promotion\)/);assert.match(gallery,/Agendar todos/);assert.match(gallery,/Agendar somente/);assert.match(gallery,/preselectedServiceIds/);assert.doesNotMatch(migration,/gallery_media[\s\S]{0,150}(price|duration|discount)/i);});

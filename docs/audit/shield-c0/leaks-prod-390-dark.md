# Leak audit 2026-11-23T15:51:28.677Z

Base: https://dawghwa.vercel.app · viewport 390 · dark · deny-list: 67 terms (derived from docs/providers/*.md (placeholder until /home/user/workspace/agents/shield/dawghwa/docs/providers/_names.json exists))

Pages: 15 · requests 1033 · bodies scanned 476 · JS chunks 70 · sourcemaps served 0

Discovered title: /title/mangadex/32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/solo-leveling · chapter: /read/mangadex/32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/dwg%3Amd%3A32d76d19-8a05-4db0-9fc2-e0b0648fe9d0%2Fund%2Fs0%2Fch%3A1?s=asurascan

Third-party hosts requested by the browser: dawghwaapi.vercel.app

**Result: FAIL**, 129 match locations (bundle 7, request 7, response 78, dom 20, url 3, storage 14)

| Category | Where | Term | Context |
|---|---|---|---|
| bundle | 200 https://dawghwa.vercel.app/assets/index-DUcJoLz2.js | mangadex | ()=>Promise.resolve(void 0),removeClient:nf}},jn="mangadex",Gg={popular:"popularity",rating:"score",latest:" |
| bundle | 200 https://dawghwa.vercel.app/assets/images-Bly5K5El.js | uploads.mangadex.org | k as t}from"./index-DUcJoLz2.js";const r="https://uploads.mangadex.org/covers/";function a(o){return!o\|\|!o.startsWith(r) |
| request | GET fetch | mangadex | //dawghwa.vercel.app/api/catalog/filters?provider=mangadex |
| response | 200 https://dawghwa.vercel.app/api/catalog/filters?provider=mangadex | mangadex | {"provider":"mangadex","capabilities":{"filters":["q","genres","exclude |
| response | 200 https://dawghwa.vercel.app/api/catalog/filters?provider=mangadex | mangadex.org | ],"attribution":{"name":"MangaDex","url":"https://mangadex.org","terms":"https://api.mangadex.org/docs/#acceptab |
| bundle | 200 https://dawghwa.vercel.app/sw.js | uploads.mangadex.org | chParams.get("url"))?void 0:e.startsWith("https://uploads.mangadex.org/covers/"))},new s.CacheFirst({cacheName:"covers", |
| response | 200 https://dawghwa.vercel.app/api/catalog?provider=mangadex&limit=100&page=1&sort=popularity | mangadex | {"provider":"mangadex","items":[{"ref":"mangadex:32d76d19-8a05-4db0-9fc |
| response | 200 https://dawghwa.vercel.app/api/catalog?provider=mangadex&limit=100&page=1&sort=popularity | mangadex.org | evel up","Tôi Thăng Cấp Một Mình"],"url":"https://mangadex.org/title/32d76d19-8a05-4db0-9fc2-e0b0648fe9d0","cove |
| response | 200 https://dawghwa.vercel.app/api/catalog?provider=mangadex&limit=100&page=1&sort=popularity | uploads.mangadex.org | a05-4db0-9fc2-e0b0648fe9d0","coverImage":"https://uploads.mangadex.org/covers/32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/e90bd |
| request | GET image | mangadex.org | wa.vercel.app/api/image?url=https%3A%2F%2Fuploads.mangadex.org%2Fcovers%2F32d76d19-8a05-4db0-9fc2-e0b0648fe9d0%2 |
| bundle | 200 https://dawghwa.vercel.app/assets/Search-2c8NZNqE.js | mangadex | ,removed:t.length-d.length-a,unknown:a}}const xs="mangadex",ys=100;async function ws(t,i={}){const a=i.want? |
| bundle | 200 https://dawghwa.vercel.app/assets/About-KscBai6l.js | mangadex.org |  the API, currently"," ",e.jsx("a",{href:"https://mangadex.org",target:"_blank",rel:"noopener noreferrer",childr |
| bundle | 200 https://dawghwa.vercel.app/assets/About-KscBai6l.js | MangaDex | rget:"_blank",rel:"noopener noreferrer",children:"MangaDex"}),". Chapters from other sources open on their o |
| bundle | 200 https://dawghwa.vercel.app/assets/About-KscBai6l.js | api.mangadex.org | ter images from the"," ",e.jsx("a",{href:"https://api.mangadex.org/docs/",target:"_blank",rel:"noopener noreferrer", |
| request | GET fetch | mangadex.org | wa.vercel.app/api/image?url=https%3A%2F%2Fuploads.mangadex.org%2Fcovers%2F32d76d19-8a05-4db0-9fc2-e0b0648fe9d0%2 |
| response | 200 https://dawghwa.vercel.app/api/catalog?provider=mangadex&limit=30&page=1&sort=popularity | mangadex | {"provider":"mangadex","items":[{"ref":"mangadex:32d76d19-8a05-4db0-9fc |
| response | 200 https://dawghwa.vercel.app/api/catalog?provider=mangadex&limit=30&page=1&sort=popularity | mangadex.org | evel up","Tôi Thăng Cấp Một Mình"],"url":"https://mangadex.org/title/32d76d19-8a05-4db0-9fc2-e0b0648fe9d0","cove |
| response | 200 https://dawghwa.vercel.app/api/catalog?provider=mangadex&limit=30&page=1&sort=popularity | uploads.mangadex.org | a05-4db0-9fc2-e0b0648fe9d0","coverImage":"https://uploads.mangadex.org/covers/32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/e90bd |
| response | 200 https://dawghwa.vercel.app/api/catalog?provider=mangadex&limit=30&page=1&sort=popularity&status=completed | mangadex | {"provider":"mangadex","items":[{"ref":"mangadex:32d76d19-8a05-4db0-9fc |
| response | 200 https://dawghwa.vercel.app/api/catalog?provider=mangadex&limit=30&page=1&sort=popularity&status=completed | mangadex.org | evel up","Tôi Thăng Cấp Một Mình"],"url":"https://mangadex.org/title/32d76d19-8a05-4db0-9fc2-e0b0648fe9d0","cove |
| response | 200 https://dawghwa.vercel.app/api/catalog?provider=mangadex&limit=30&page=1&sort=popularity&status=completed | uploads.mangadex.org | a05-4db0-9fc2-e0b0648fe9d0","coverImage":"https://uploads.mangadex.org/covers/32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/e90bd |
| response | 200 https://dawghwa.vercel.app/api/catalog?provider=mangadex&limit=40&page=1&sort=popularity&format=manhwa | mangadex | {"provider":"mangadex","items":[{"ref":"mangadex:32d76d19-8a05-4db0-9fc |
| response | 200 https://dawghwa.vercel.app/api/catalog?provider=mangadex&limit=40&page=1&sort=popularity&format=manhwa | mangadex.org | evel up","Tôi Thăng Cấp Một Mình"],"url":"https://mangadex.org/title/32d76d19-8a05-4db0-9fc2-e0b0648fe9d0","cove |
| response | 200 https://dawghwa.vercel.app/api/catalog?provider=mangadex&limit=40&page=1&sort=popularity&format=manhwa | uploads.mangadex.org | a05-4db0-9fc2-e0b0648fe9d0","coverImage":"https://uploads.mangadex.org/covers/32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/e90bd |
| response | 200 https://dawghwa.vercel.app/api/catalog?provider=mangadex&limit=40&page=1&sort=popularity&year=2026 | mangadex | {"provider":"mangadex","items":[{"ref":"mangadex:5272da37-6c69-4ecc-a1e |
| response | 200 https://dawghwa.vercel.app/api/catalog?provider=mangadex&limit=40&page=1&sort=popularity&year=2026 | mangadex.org | вичайного другорядного персонажа"],"url":"https://mangadex.org/title/5272da37-6c69-4ecc-a1e0-d25db7b3e80f","cove |
| response | 200 https://dawghwa.vercel.app/api/catalog?provider=mangadex&limit=40&page=1&sort=popularity&year=2026 | uploads.mangadex.org | c69-4ecc-a1e0-d25db7b3e80f","coverImage":"https://uploads.mangadex.org/covers/5272da37-6c69-4ecc-a1e0-d25db7b3e80f/3ef08 |
| response | 200 https://dawghwa.vercel.app/api/catalog?provider=mangadex&limit=40&page=1&sort=updated | mangadex | {"provider":"mangadex","items":[{"ref":"mangadex:dc07afaa-643a-4bf4-a9d |
| response | 200 https://dawghwa.vercel.app/api/catalog?provider=mangadex&limit=40&page=1&sort=updated | mangadex.org | "在监狱里驯服了忠犬系男主人公 (2023)","獄見忠犬男主角"],"url":"https://mangadex.org/title/dc07afaa-643a-4bf4-a9d0-b21ecc101736","cove |
| response | 200 https://dawghwa.vercel.app/api/catalog?provider=mangadex&limit=40&page=1&sort=updated | uploads.mangadex.org | 43a-4bf4-a9d0-b21ecc101736","coverImage":"https://uploads.mangadex.org/covers/dc07afaa-643a-4bf4-a9d0-b21ecc101736/9a73f |
| response | 200 https://dawghwa.vercel.app/api/catalog?provider=mangadex&limit=40&page=1&sort=popularity&format=manga | mangadex | {"provider":"mangadex","items":[{"ref":"mangadex:aa6c76f7-5f5f-46b6-a80 |
| response | 200 https://dawghwa.vercel.app/api/catalog?provider=mangadex&limit=40&page=1&sort=popularity&format=manga | mangadex.org | 감 인형은 사랑을 한다","更衣人偶墜入愛河","戀上換裝娃娃"],"url":"https://mangadex.org/title/aa6c76f7-5f5f-46b6-a800-911145f81b9b","cove |
| response | 200 https://dawghwa.vercel.app/api/catalog?provider=mangadex&limit=40&page=1&sort=popularity&format=manga | uploads.mangadex.org | f5f-46b6-a800-911145f81b9b","coverImage":"https://uploads.mangadex.org/covers/aa6c76f7-5f5f-46b6-a800-911145f81b9b/d3e90 |
| response | 200 https://dawghwa.vercel.app/api/titles/mangadex%3A32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/chapters/all?stream=1 | mangadex | g:md:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0","ref":"mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0","title":"So |
| response | 200 https://dawghwa.vercel.app/api/titles/mangadex%3A32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/chapters/all?stream=1 | mangakatana | -match"}} {"event":"source","report":{"sourceId":"mangakatana","source":"MangaKatana","status":"review","consid |
| response | 200 https://dawghwa.vercel.app/api/catalog?provider=mangadex&limit=100&page=1&sort=score | mangadex | {"provider":"mangadex","items":[{"ref":"mangadex:1044287a-73df-48d0-b0b |
| response | 200 https://dawghwa.vercel.app/api/catalog?provider=mangadex&limit=100&page=1&sort=score | mangadex.org | teel Ball Run (Official Colored)"],"url":"https://mangadex.org/title/1044287a-73df-48d0-b0b2-5327f32dd651","cove |
| response | 200 https://dawghwa.vercel.app/api/catalog?provider=mangadex&limit=100&page=1&sort=score | uploads.mangadex.org | 3df-48d0-b0b2-5327f32dd651","coverImage":"https://uploads.mangadex.org/covers/1044287a-73df-48d0-b0b2-5327f32dd651/92e82 |
| response | 200 https://dawghwa.vercel.app/api/catalog?provider=mangadex&limit=40&page=1&sort=score | mangadex | {"provider":"mangadex","items":[{"ref":"mangadex:1044287a-73df-48d0-b0b |
| response | 200 https://dawghwa.vercel.app/api/catalog?provider=mangadex&limit=40&page=1&sort=score | mangadex.org | teel Ball Run (Official Colored)"],"url":"https://mangadex.org/title/1044287a-73df-48d0-b0b2-5327f32dd651","cove |
| response | 200 https://dawghwa.vercel.app/api/catalog?provider=mangadex&limit=40&page=1&sort=score | uploads.mangadex.org | 3df-48d0-b0b2-5327f32dd651","coverImage":"https://uploads.mangadex.org/covers/1044287a-73df-48d0-b0b2-5327f32dd651/92e82 |
| dom | / attributes | mangadex | [aria-label]=1 of 6: Solo Leveling a[href]=/title/mangadex/32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/solo-levelin |
| dom | / attributes | mangadex.org | ing img[src]=/api/image?url=https%3A%2F%2Fuploads.mangadex.org%2Fcovers%2F32d76d19-8a05-4db0-9fc2-e0b0648fe9d0%2 |
| dom | /discover attributes | mangadex.org | ion img[src]=/api/image?url=https%3A%2F%2Fuploads.mangadex.org%2Fcovers%2F32d76d19-8a05-4db0-9fc2-e0b0648fe9d0%2 |
| response | 200 https://dawghwa.vercel.app/api/catalog?provider=mangadex&limit=3&page=1&sort=newest | mangadex | {"provider":"mangadex","items":[{"ref":"mangadex:fa03fce4-88ca-4280-9ef |
| response | 200 https://dawghwa.vercel.app/api/catalog?provider=mangadex&limit=3&page=1&sort=newest | mangadex.org | ～第二の人生は愛するグルメともふもふに囲まれて楽しく暮らします～"],"url":"https://mangadex.org/title/fa03fce4-88ca-4280-9ef0-79d171f5cd53","cove |
| response | 200 https://dawghwa.vercel.app/api/catalog?provider=mangadex&limit=3&page=1&sort=newest | uploads.mangadex.org | 8ca-4280-9ef0-79d171f5cd53","coverImage":"https://uploads.mangadex.org/covers/fa03fce4-88ca-4280-9ef0-79d171f5cd53/09ccb |
| response | 200 https://dawghwa.vercel.app/api/catalog?provider=mangadex&limit=3&page=1&sort=popularity&format=manga | mangadex | {"provider":"mangadex","items":[{"ref":"mangadex:aa6c76f7-5f5f-46b6-a80 |
| response | 200 https://dawghwa.vercel.app/api/catalog?provider=mangadex&limit=3&page=1&sort=popularity&format=manga | mangadex.org | 감 인형은 사랑을 한다","更衣人偶墜入愛河","戀上換裝娃娃"],"url":"https://mangadex.org/title/aa6c76f7-5f5f-46b6-a800-911145f81b9b","cove |
| response | 200 https://dawghwa.vercel.app/api/catalog?provider=mangadex&limit=3&page=1&sort=popularity&format=manga | uploads.mangadex.org | f5f-46b6-a800-911145f81b9b","coverImage":"https://uploads.mangadex.org/covers/aa6c76f7-5f5f-46b6-a800-911145f81b9b/d3e90 |
| response | 200 https://dawghwa.vercel.app/api/catalog?provider=mangadex&limit=10&page=1&sort=popularity&year=2026 | mangadex | {"provider":"mangadex","items":[{"ref":"mangadex:5272da37-6c69-4ecc-a1e |
| response | 200 https://dawghwa.vercel.app/api/catalog?provider=mangadex&limit=10&page=1&sort=popularity&year=2026 | mangadex.org | вичайного другорядного персонажа"],"url":"https://mangadex.org/title/5272da37-6c69-4ecc-a1e0-d25db7b3e80f","cove |
| response | 200 https://dawghwa.vercel.app/api/catalog?provider=mangadex&limit=10&page=1&sort=popularity&year=2026 | uploads.mangadex.org | c69-4ecc-a1e0-d25db7b3e80f","coverImage":"https://uploads.mangadex.org/covers/5272da37-6c69-4ecc-a1e0-d25db7b3e80f/3ef08 |
| response | 200 https://dawghwa.vercel.app/api/catalog?provider=mangadex&limit=3&page=1&sort=popularity&genre=Romance | mangadex | {"provider":"mangadex","items":[{"ref":"mangadex:aa6c76f7-5f5f-46b6-a80 |
| response | 200 https://dawghwa.vercel.app/api/catalog?provider=mangadex&limit=3&page=1&sort=popularity&genre=Romance | mangadex.org | 감 인형은 사랑을 한다","更衣人偶墜入愛河","戀上換裝娃娃"],"url":"https://mangadex.org/title/aa6c76f7-5f5f-46b6-a800-911145f81b9b","cove |
| response | 200 https://dawghwa.vercel.app/api/catalog?provider=mangadex&limit=3&page=1&sort=popularity&genre=Romance | uploads.mangadex.org | f5f-46b6-a800-911145f81b9b","coverImage":"https://uploads.mangadex.org/covers/aa6c76f7-5f5f-46b6-a800-911145f81b9b/d3e90 |
| response | 200 https://dawghwa.vercel.app/api/catalog?provider=mangadex&limit=3&page=1&sort=updated | mangadex | {"provider":"mangadex","items":[{"ref":"mangadex:dc07afaa-643a-4bf4-a9d |
| response | 200 https://dawghwa.vercel.app/api/catalog?provider=mangadex&limit=3&page=1&sort=updated | mangadex.org | "在监狱里驯服了忠犬系男主人公 (2023)","獄見忠犬男主角"],"url":"https://mangadex.org/title/dc07afaa-643a-4bf4-a9d0-b21ecc101736","cove |
| response | 200 https://dawghwa.vercel.app/api/catalog?provider=mangadex&limit=3&page=1&sort=updated | uploads.mangadex.org | 43a-4bf4-a9d0-b21ecc101736","coverImage":"https://uploads.mangadex.org/covers/dc07afaa-643a-4bf4-a9d0-b21ecc101736/9a73f |
| response | 200 https://dawghwa.vercel.app/api/catalog?provider=mangadex&limit=3&page=1&sort=popularity&status=completed | mangadex | {"provider":"mangadex","items":[{"ref":"mangadex:32d76d19-8a05-4db0-9fc |
| response | 200 https://dawghwa.vercel.app/api/catalog?provider=mangadex&limit=3&page=1&sort=popularity&status=completed | mangadex.org | evel up","Tôi Thăng Cấp Một Mình"],"url":"https://mangadex.org/title/32d76d19-8a05-4db0-9fc2-e0b0648fe9d0","cove |
| response | 200 https://dawghwa.vercel.app/api/catalog?provider=mangadex&limit=3&page=1&sort=popularity&status=completed | uploads.mangadex.org | a05-4db0-9fc2-e0b0648fe9d0","coverImage":"https://uploads.mangadex.org/covers/32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/e90bd |
| response | 200 https://dawghwa.vercel.app/api/catalog?provider=mangadex&limit=3&page=1&sort=popularity&format=manhwa | mangadex | {"provider":"mangadex","items":[{"ref":"mangadex:32d76d19-8a05-4db0-9fc |
| response | 200 https://dawghwa.vercel.app/api/catalog?provider=mangadex&limit=3&page=1&sort=popularity&format=manhwa | mangadex.org | evel up","Tôi Thăng Cấp Một Mình"],"url":"https://mangadex.org/title/32d76d19-8a05-4db0-9fc2-e0b0648fe9d0","cove |
| response | 200 https://dawghwa.vercel.app/api/catalog?provider=mangadex&limit=3&page=1&sort=popularity&format=manhwa | uploads.mangadex.org | a05-4db0-9fc2-e0b0648fe9d0","coverImage":"https://uploads.mangadex.org/covers/32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/e90bd |
| response | 200 https://dawghwa.vercel.app/api/catalog?provider=mangadex&limit=3&page=1&sort=score | mangadex | {"provider":"mangadex","items":[{"ref":"mangadex:1044287a-73df-48d0-b0b |
| response | 200 https://dawghwa.vercel.app/api/catalog?provider=mangadex&limit=3&page=1&sort=score | mangadex.org | teel Ball Run (Official Colored)"],"url":"https://mangadex.org/title/1044287a-73df-48d0-b0b2-5327f32dd651","cove |
| response | 200 https://dawghwa.vercel.app/api/catalog?provider=mangadex&limit=3&page=1&sort=score | uploads.mangadex.org | 3df-48d0-b0b2-5327f32dd651","coverImage":"https://uploads.mangadex.org/covers/1044287a-73df-48d0-b0b2-5327f32dd651/92e82 |
| response | 200 https://dawghwa.vercel.app/api/catalog?provider=mangadex&limit=3&page=1&sort=popularity&format=manhua | mangadex | {"provider":"mangadex","items":[{"ref":"mangadex:8b34f37a-0181-4f0b-8ce |
| response | 200 https://dawghwa.vercel.app/api/catalog?provider=mangadex&limit=3&page=1&sort=popularity&format=manhua | mangadex.org |  ác dịch tiểu thư!","请欺负我吧，恶役小姐！"],"url":"https://mangadex.org/title/8b34f37a-0181-4f0b-8ce3-01217e9a602c","cove |
| response | 200 https://dawghwa.vercel.app/api/catalog?provider=mangadex&limit=3&page=1&sort=popularity&format=manhua | uploads.mangadex.org | 181-4f0b-8ce3-01217e9a602c","coverImage":"https://uploads.mangadex.org/covers/8b34f37a-0181-4f0b-8ce3-01217e9a602c/53447 |
| dom | /search attributes | mangadex | d Is Coming on Strong to Me, a Mob a[href]=/title/mangadex/5272da37-6c69-4ecc-a1e0-d25db7b3e80f/the-protagon |
| dom | /search attributes | mangadex.org | -me img[src]=/api/image?url=https%3A%2F%2Fuploads.mangadex.org%2Fcovers%2F5272da37-6c69-4ecc-a1e0-d25db7b3e80f%2 |
| dom | /about text | MangaDex |  provide chapter pages through the API, currently MangaDex. Chapters from other sources open on their own si |
| dom | /about attributes | mangadex.org | face-BUcVtJd4.webp a[href]=/start a[href]=https://mangadex.org a[href]=https://github.com/GooglyBlox/comick-sour |
| dom | /about attributes | api.mangadex.org | .com/GooglyBlox/comick-source-api a[href]=https://api.mangadex.org/docs/ a[href]=https://github.com/Titan717/dawghwa |
| response | 200 https://dawghwa.vercel.app/api/catalog?provider=mangadex&limit=40&page=1&sort=popularity&format=manhua | mangadex | {"provider":"mangadex","items":[{"ref":"mangadex:8b34f37a-0181-4f0b-8ce |
| response | 200 https://dawghwa.vercel.app/api/catalog?provider=mangadex&limit=40&page=1&sort=popularity&format=manhua | mangadex.org |  ác dịch tiểu thư!","请欺负我吧，恶役小姐！"],"url":"https://mangadex.org/title/8b34f37a-0181-4f0b-8ce3-01217e9a602c","cove |
| response | 200 https://dawghwa.vercel.app/api/catalog?provider=mangadex&limit=40&page=1&sort=popularity&format=manhua | uploads.mangadex.org | 181-4f0b-8ce3-01217e9a602c","coverImage":"https://uploads.mangadex.org/covers/8b34f37a-0181-4f0b-8ce3-01217e9a602c/53447 |
| response | 200 https://dawghwa.vercel.app/api/catalog?provider=mangadex&limit=100&page=1&sort=popularity&genre=Action | mangadex | {"provider":"mangadex","items":[{"ref":"mangadex:32d76d19-8a05-4db0-9fc |
| response | 200 https://dawghwa.vercel.app/api/catalog?provider=mangadex&limit=100&page=1&sort=popularity&genre=Action | mangadex.org | evel up","Tôi Thăng Cấp Một Mình"],"url":"https://mangadex.org/title/32d76d19-8a05-4db0-9fc2-e0b0648fe9d0","cove |
| response | 200 https://dawghwa.vercel.app/api/catalog?provider=mangadex&limit=100&page=1&sort=popularity&genre=Action | uploads.mangadex.org | a05-4db0-9fc2-e0b0648fe9d0","coverImage":"https://uploads.mangadex.org/covers/32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/e90bd |
| response | 200 https://dawghwa.vercel.app/api/catalog?provider=mangadex&limit=100&page=1&sort=popularity&format=manhwa&genre=Action | mangadex | {"provider":"mangadex","items":[{"ref":"mangadex:32d76d19-8a05-4db0-9fc |
| response | 200 https://dawghwa.vercel.app/api/catalog?provider=mangadex&limit=100&page=1&sort=popularity&format=manhwa&genre=Action | mangadex.org | evel up","Tôi Thăng Cấp Một Mình"],"url":"https://mangadex.org/title/32d76d19-8a05-4db0-9fc2-e0b0648fe9d0","cove |
| response | 200 https://dawghwa.vercel.app/api/catalog?provider=mangadex&limit=100&page=1&sort=popularity&format=manhwa&genre=Action | uploads.mangadex.org | a05-4db0-9fc2-e0b0648fe9d0","coverImage":"https://uploads.mangadex.org/covers/32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/e90bd |
| request | GET document | mangadex | https://dawghwa.vercel.app/title/mangadex/32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/solo-levelin |
| response | 200 https://dawghwa.vercel.app/api/sources | mangadex | {"sources":[{"id":"mangadex","name":"MangaDex","baseUrl":"https://mangadex.or |
| response | 200 https://dawghwa.vercel.app/api/sources | mangadex.org | ":"mangadex","name":"MangaDex","baseUrl":"https://mangadex.org","description":"MangaDex - https://mangadex.org", |
| response | 200 https://dawghwa.vercel.app/api/titles/mangadex%3A32d76d19-8a05-4db0-9fc2-e0b0648fe9d0 | mangadex | {"title":{"ref":"mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0","provider": |
| response | 200 https://dawghwa.vercel.app/api/titles/mangadex%3A32d76d19-8a05-4db0-9fc2-e0b0648fe9d0 | mangadex.org | evel up","Tôi Thăng Cấp Một Mình"],"url":"https://mangadex.org/title/32d76d19-8a05-4db0-9fc2-e0b0648fe9d0","cove |
| response | 200 https://dawghwa.vercel.app/api/titles/mangadex%3A32d76d19-8a05-4db0-9fc2-e0b0648fe9d0 | uploads.mangadex.org | a05-4db0-9fc2-e0b0648fe9d0","coverImage":"https://uploads.mangadex.org/covers/32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/e90bd |
| url | /title/mangadex/32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/solo-leveling | mangadex | https://dawghwa.vercel.app/title/mangadex/32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/solo-levelin |
| dom | /title/mangadex/32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/solo-leveling text | AsuraScan | Readers also like 201 chapters Read in Dawghwa · AsuraScan All sources 1 available AsuraScan Available · la |
| dom | /title/mangadex/32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/solo-leveling text | MangaKatana | lable · latest ch. 200 WEBTOON Not on this source MangaKatana Needs review Dynasty Reader Not on this source As |
| dom | /title/mangadex/32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/solo-leveling text | Eva Scans | ns Not on this source Elf Toon Not on this source Eva Scans Not on this source Genz Toons Not on this source  |
| dom | /title/mangadex/32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/solo-leveling text | Manhuaplus | gasushi Not on this source Mangataro Needs review Manhuaplus Not on this source Manhuaus Not on this source Mg |
| dom | /title/mangadex/32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/solo-leveling attributes | uploads.mangadex.org | eived the power to hunt mon meta[content]=https://uploads.mangadex.org/covers/32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/e90bd |
| dom | /title/mangadex/32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/solo-leveling attributes | mangadex | js meta[content]=https://dawghwa.vercel.app/title/mangadex/32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/solo-levelin |
| dom | /title/mangadex/32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/solo-leveling attributes | mangadex.org | der img[src]=/api/image?url=https%3A%2F%2Fuploads.mangadex.org%2Fcovers%2F32d76d19-8a05-4db0-9fc2-e0b0648fe9d0%2 |
| request | GET document | asurascan | 8a05-4db0-9fc2-e0b0648fe9d0%2Fund%2Fs0%2Fch%3A1?s=asurascan |
| request | GET image | asurascans.com | hwaapi.vercel.app/api/image?url=https%3A%2F%2Fcdn.asurascans.com%2Fasura-images%2Fchapters%2Fsolo-leveling%2F1%2F0 |
| request | GET image | asurascan | o-leveling%2F1%2F001.webp%3Fv%3D1770499638&source=asurascan |
| response | 200 https://dawghwa.vercel.app/api/pages | asurascans.com | hwaapi.vercel.app/api/image?url=https%3A%2F%2Fcdn.asurascans.com%2Fasura-images%2Fchapters%2Fsolo-leveling%2F1%2F0 |
| response | 200 https://dawghwa.vercel.app/api/pages | asurascan | o-leveling%2F1%2F001.webp%3Fv%3D1770499638&source=asurascan","width":720,"height":4000},{"index":1,"url":"htt |
| url | /read/mangadex/32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/dwg%3Amd%3A32d76d19-8a05-4db0-9fc2-e0b0648fe9d0%2Fund%2Fs0%2Fch%3A1?s=asurascan | mangadex | https://dawghwa.vercel.app/read/mangadex/32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/dwg:md:32d76 |
| url | /read/mangadex/32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/dwg%3Amd%3A32d76d19-8a05-4db0-9fc2-e0b0648fe9d0%2Fund%2Fs0%2Fch%3A1?s=asurascan | asurascan | 2d76d19-8a05-4db0-9fc2-e0b0648fe9d0/und/s0/ch:1?s=asurascan |
| dom | /read/mangadex/32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/dwg%3Amd%3A32d76d19-8a05-4db0-9fc2-e0b0648fe9d0%2Fund%2Fs0%2Fch%3A1?s=asurascan attributes | mangadex | ref]=/assets/cosmetics-Koom9hf_.js a[href]=/title/mangadex/32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/solo-levelin |
| dom | /read/mangadex/32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/dwg%3Amd%3A32d76d19-8a05-4db0-9fc2-e0b0648fe9d0%2Fund%2Fs0%2Fch%3A1?s=asurascan attributes | asurascans.com | hwaapi.vercel.app/api/image?url=https%3A%2F%2Fcdn.asurascans.com%2Fasura-images%2Fchapters%2Fsolo-leveling%2F1%2F0 |
| dom | /read/mangadex/32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/dwg%3Amd%3A32d76d19-8a05-4db0-9fc2-e0b0648fe9d0%2Fund%2Fs0%2Fch%3A1?s=asurascan attributes | asurascan | o-leveling%2F1%2F001.webp%3Fv%3D1770499638&source=asurascan img[alt]=Page 1 img[src]=https://dawghwaapi.verce |
| response | 200 https://dawghwa.vercel.app/api/catalog?provider=mangadex&limit=40&page=1&q=solo&sort=relevance | mangadex | {"provider":"mangadex","items":[{"ref":"mangadex:2fcb3bba-3609-4101-91f |
| response | 200 https://dawghwa.vercel.app/api/catalog?provider=mangadex&limit=40&page=1&q=solo&sort=relevance | mangadex.org | e World's Strongest at Solo Play"],"url":"https://mangadex.org/title/2fcb3bba-3609-4101-91fd-4349952aecb8","cove |
| response | 200 https://dawghwa.vercel.app/api/catalog?provider=mangadex&limit=40&page=1&q=solo&sort=relevance | uploads.mangadex.org | 609-4101-91fd-4349952aecb8","coverImage":"https://uploads.mangadex.org/covers/2fcb3bba-3609-4101-91fd-4349952aecb8/6c87f |
| dom | /search?q=solo attributes | mangadex | rprise! I’m Actually a Berserker!~ a[href]=/title/mangadex/b00acc54-2bf1-440e-8f33-da87227d82d6/vrmmo-chroni |
| dom | /search?q=solo attributes | mangadex.org | -be img[src]=/api/image?url=https%3A%2F%2Fuploads.mangadex.org%2Fcovers%2Fb00acc54-2bf1-440e-8f33-da87227d82d6%2 |
| storage | sessionStorage value react-router-scroll-positions | mangadex | ts":1500,"/about":286,"/does-not-exist":0,"/title/mangadex/32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/solo-levelin |
| storage | IndexedDB dawghwa/events values | mangadex | 7-6245ceb9474d","seq":1,"kind":"open","titleKey":"mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0","at":179544 |
| storage | IndexedDB dawghwa/intel values | mangadex | .00839,3793,0.00839,3990,0.02098],"n":1,"liked":{"mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0":0.079999981 |
| storage | IndexedDB dawghwa/kv values | MangaDex | ":1795449078203,\"state\":{\"data\":{\"source\":\"MangaDex\",\"sourceId\":\"mangadex\",\"tags\":[{\"name\":\ |
| storage | IndexedDB dawghwa/progress keys | mangadex | ["8f23f143-3a5d-4f61-b0b7-6245ceb9474d","mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0"] |
| storage | IndexedDB dawghwa/progress values | mangadex | 8f23f143-3a5d-4f61-b0b7-6245ceb9474d","titleKey":"mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0","chapterId" |
| storage | IndexedDB dawghwa/progress values | asurascan | -4db0-9fc2-e0b0648fe9d0/und/s0/ch:1","variantId":"asurascan:1","sourceId":"asurascan","language":null,"chapte |
| storage | IndexedDB dawghwa/titles keys | mangadex | "mangadex:06223ae2-ce16-48d6-aa87-e69e8c3634b9" "mangadex:0 |
| storage | IndexedDB dawghwa/titles values | mangadex | [{"key":"mangadex:06223ae2-ce16-48d6-aa87-e69e8c3634b9","sourceId": |
| storage | IndexedDB dawghwa/titles values | mangadex.org | 23ae2-ce16-48d6-aa87-e69e8c3634b9","url":"https://mangadex.org/title/06223ae2-ce16-48d6-aa87-e69e8c3634b9","titl |
| storage | IndexedDB dawghwa/titles values | uploads.mangadex.org | 4b9","title":"Soloist in a Cage","cover":"https://uploads.mangadex.org/covers/06223ae2-ce16-48d6-aa87-e69e8c3634b9/32781 |
| storage | IndexedDB workbox-expiration/cache-entries keys | mangadex.org | wa.vercel.app/api/image?url=https%3A%2F%2Fuploads.mangadex.org%2Fcovers%2F06223ae2-ce16-48d6-aa87-e69e8c3634b9%2 |
| storage | IndexedDB workbox-expiration/cache-entries values | mangadex.org | wa.vercel.app/api/image?url=https%3A%2F%2Fuploads.mangadex.org%2Fcovers%2F06223ae2-ce16-48d6-aa87-e69e8c3634b9%2 |
| storage | CacheStorage covers | mangadex.org | wa.vercel.app/api/image?url=https%3A%2F%2Fuploads.mangadex.org%2Fcovers%2Faa6c76f7-5f5f-46b6-a800-911145f81b9b%2 |
| response | 200 /sw.js | uploads.mangadex.org | chParams.get("url"))?void 0:e.startsWith("https://uploads.mangadex.org/covers/"))},new s.CacheFirst({cacheName:"covers", |

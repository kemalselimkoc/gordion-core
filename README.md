# Gordion Core

Created by @kemalselimkoc.

Gordion'un TypeScript/Node.js metin sohbeti çekirdeği. İlk akış: **Sen → terminal → Core → OpenAI → cevap**. Windows Agent ayrı repository'de, sonraki aşamada geliştirilecek.

## Gereksinimler ve demo

Node.js 24 LTS ve npm. Test edilen sürüm: Node.js 24.21.0. Bağımlılıklar package-lock.json ile sabitlenir.

Gordion geliştirme terminalinden bu repository klasörüne geç:

```bat
cd ..\gordion-core
npm ci
npm run demo
```

Demo bir dil modeli değildir; API çağrısı yapmadan terminal ve oturum akışını gösterir. Bir mesaj yazıp Enter'a bas.

## Gerçek OpenAI bağlantısı

1. `.env.example` dosyasını `.env` adıyla kopyala.
2. Yerel dosyada `OPENAI_API_KEY` ve hesabında erişilebilir bir Responses metin modeli için `OPENAI_MODEL` ayarla. Anahtarı sohbet mesajına, ekran görüntüsüne veya GitHub'a ekleme.
3. `npm run build` ardından `npm start` çalıştır.

Model seçimi ve canlı API/bütçe doğrulaması henüz yapılmadı. Eksik ayarla canlı mod başlamaz; sessizce demo moduna geçmez. `.env` Git tarafından dışlanır ancak diskte şifreli değildir; bu yerel geliştirme yöntemi, ürünün secret kasası değildir.

Komutlar: `/exit`, `/reset`, `/usage`, `/cancel`. Yanıt beklerken Ctrl+C isteği iptal eder; boşta Ctrl+C çıkar. Devam eden istek sırasında yeni mesajlar kuyruğa alınmaz, açıkça reddedilir.

## Sınırlar ve veri

- Varsayılan süreç başına 10 istek, yanıt başına en fazla 512 çıktı tokenı, 30 saniye timeout. Otomatik retry yoktur. Hatalı/iptal edilen girişimler de istek sınırından düşer.
- Tek mesaj en fazla 4000, konuşma bağlamı en fazla 24000 karakter. `/reset` bağlamı temizler, istek/kullanım sayacını sıfırlamaz.
- Bunlar **para cinsinden kesin harcama limiti değildir**. Yeniden başlatınca sayaçlar sıfırlanır. İptal sunucu tarafındaki işlemi/ücreti kesin durdurmaz. Gerçek dolar bütçesi ve kalıcı kullanım denetimi henüz yok; foundation aşama 1 tamamlanmış sayılmaz.
- `/usage` yalnızca başarıyla alınan cevapların token kullanımını ve toplam girişim sayısını gösterir. Hata/timeout sonrası bilinmeyen kullanım ve diğer süreçler dahil değildir. Dosyaya kullanım/sohbet kaydı yazılmaz.
- Konuşma yalnızca süreç belleğinde tutulur; başarılı mesajlar sonraki çağrıda OpenAI'a tekrar gönderilir. `store:false` ayarı kullanılır; bu, tüm sağlayıcı veri saklama süreçlerinin kapandığı iddiası değildir.
- Modelin hiçbir tool/Windows/dosya/PowerShell yetkisi yoktur. Terminal çıktısı komut olarak çalıştırılmaz. Cloud, ses ve kalıcı hafıza yoktur.

## Kontroller

```bat
npm run check
npm test
```

Testler SDK'nın HTTP katmanını taklit eder; gerçek anahtar veya ücretli çağrı gerekmez. Bağlam, limitler, iptal, hata sonrası durum ve 429/retry davranışı test edilir. Gerçek API uçtan uca testi bekliyor.

Yerel derleme ve 10 test geçti. [GitHub Actions](.github/workflows/check.yml), push ve pull request sırasında Windows üzerinde bağımlılık kurulumu, tip kontrolü ve testleri çalıştırır. Action referansları commit SHA ile sabitlenmiştir; workflow yalnızca repository okuma yetkisine sahiptir. Gerçek API anahtarı kullanılmaz.

## Kaynak ve lisans

- [Gordion Foundation](https://github.com/kemalselimkoc/gordion-foundation)
- [Resmî OpenAI başlangıç rehberi](https://developers.openai.com/api/docs/quickstart)
- [Responses API ve store ayarı](https://developers.openai.com/api/docs/guides/migrate-to-responses)

Açık kaynak hedefleniyor; lisans seçimi bekliyor. Henüz kullanım/dağıtım lisansı verilmiş olarak değerlendirilmemeli. Yazar bilgisi AUTHORS.md ve AGENTS.md içindedir.

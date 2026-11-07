# Sesli Kitap V2 — Zümrüt Kütüphane

## Kurulum
Bu klasördeki `index.html`, `styles.css`, `script.js` ve `manifest.json` dosyalarını GitHub deposunun köküne yükleyin. GitHub Pages `main` / `(root)` ayarını kullanıyorsanız site otomatik güncellenir. Önce eski sürümü ayrı bir dalda veya ZIP dosyasında saklayın.

## Bu sürümde
- Responsive zümrüt/altın tasarım: ana sayfa, kitaplık, okuyucu
- PDF.js ile yerel PDF metin çıkarma
- Web Speech API ile seçilebilir Türkçe sesler, hız/ton ayarı, cümleden devam
- Sayfa ve cümle konumu localStorage'da tutulur
- Görünürlük, ses hataları ve eşzamansız sayfa değişimi için iyileştirmeler
- Kitaplıkta son açılmış PDF'lerin isimleri tutulur; **PDF dosyalarının kendisi saklanmaz**, yeniden seçilmesi gerekir

## Bilinen sınırlar
- iPhone Safari'de ekran kilidi / arka plana geçiş sırasında Web Speech API güvenilir biçimde devam etmez.
- Taranmış (görüntü) PDF'lerde OCR yoktur.
- PDF.js ve Google Fonts CDN üzerinden yüklenir, ilk açılışta ağ gerekir.
- Türkçe cümle bölme `Intl.Segmenter` varsa onu, yoksa basit bir yedek yöntemi kullanır.
- Henüz PWA ikonları ve çevrimdışı servis çalışanı eklenmedi.
- Gerçek iPhone üzerinde test edilmedi; tarayıcıda elle kontrol edilmelidir.

## Kontrol listesi
1. Masaüstü ve iPhone Safari'de ana sayfa, kütüphane ve okuyucu sekmelerine geçin.
2. Metin içeren PDF yükleyin; sayfa ve cümle gezinmesini test edin.
3. Türkçe ses seçin; Oku/Duraklat, hız ve ton ayarlarını kontrol edin.
4. Sayfa değiştirirken seslendirmeyi deneyin.
5. Sayfayı yeniden yükleyin; aynı PDF'yi seçip son konuma dönüşü kontrol edin.
6. Taranmış PDF'de açıklayıcı uyarının çıktığını doğrulayın.

## Gizlilik
Bu sürüm dosyaları bir sunucuya göndermeden tarayıcıda işler. Dosya adı ve okuma konumu tarayıcının yerel saklama alanına kaydedilir. PDF.js ve Google Fonts kodları CDN'den yüklenmektedir.

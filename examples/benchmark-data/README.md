# TONL Benchmark Verileri

Bu klasör, TONL formatının performansını test etmek için kullanılan örnek veri dosyalarını içermektedir.

## Dosya Yapısı

### JSON Dosyaları (Farklı Boyutlarda)

#### 📄 Küçük Boyut - Kullanıcı Verisi
- **Dosya**: `small-user-data.json` (417 bytes)
- **İçerik**: Tek bir kullanıcının profil bilgileri, tercihler ve istatistikler
- **Kullanım Alanı**: Kullanıcı profilleri, konfigürasyon dosyaları

#### 📄 Orta Boyut - E-Ticaret Kataloğu
- **Dosya**: `medium-ecommerce.json` (6.9 KB)
- **İçerik**: Ürün kataloğu, müşteri bilgileri, siparişler ve analitik veriler
- **Kullanım Alanı**: E-ticaret platformları, ürün yönetimi

#### 📄 Büyük Boyut - Sağlık Verisi
- **Dosya**: `large-healthcare.json` (12.6 KB)
- **İçerik**: Hastane yönetim sistemi verileri (hasta kayıtları, personel, randevular)
- **Kullanım Alanı**: Hastane bilgi sistemleri, tıbbi kayıtlar

### YAML Dosyaları

#### ⚙️ Küçük - Uygulama Konfigürasyonu
- **Dosya**: `small-config.yaml`
- **İçerik**: Web uygulaması yapılandırma ayarları
- **Kullanım Alanı**: Config dosyaları, deployment ayarları

#### 📊 Orta - Proje Yönetimi
- **Dosya**: `medium-projects.yaml`
- **İçerik**: Proje yönetim sistemi verileri (görevler, ekip, bütçe)
- **Kullanım Alanı**: Project management tools, ekip iş birliği

### CSV Dosyaları

#### 👥 Küçük - Çalışan Listesi
- **Dosya**: `small-employees.csv`
- **İçerik**: Çalışan bilgileri ve departman atamaları
- **Kullanım Alanı**: HR sistemleri, personel yönetimi

#### 💰 Orta - Satış Verileri
- **Dosya**: `medium-sales.csv`
- **İçerik**: Satış siparişleri, müşteri bilgileri, ürün detayları
- **Kullanım Alanı**: Satış raporları, CRM sistemleri

### TONL Formatları

Her JSON dosyası için otomatik olarak oluşturulmuş TONL versiyonları:
- `small-user-data.tonl`
- `medium-ecommerce.tonl`
- `large-healthcare.tonl`
- `*-smart.tonl` (Smart encoding ile optimize edilmiş versiyonlar)

## Benchmark Sonuçları

### Format Karşılaştırması

| Dosya | JSON (Bytes) | TONL (Bytes) | Smart (Bytes) | Kazanç (%) |
|-------|--------------|--------------|---------------|------------|
| small-user-data.json | 417 | 438 | 451 | -5.0% |
| medium-ecommerce.json | 6,863 | 5,493 | 5,506 | 20.0% |
| large-healthcare.json | 12,912 | 8,942 | 8,949 | 30.7% |

**Özet**:
- 📁 **Toplam JSON Boyutu**: 20,192 bytes
- 📦 **Toplam TONL Boyutu**: 14,873 bytes
- 💾 **Byte Tasarrufu**: **26.3%**
- 🧠 **Token Tasarrufu**: **30.4%**

### Token Analizi (Tahmini)

| Model | JSON Maliyet | TONL Maliyet | Tasarruf |
|-------|--------------|--------------|----------|
| GPT-4 | $0.1505 | $0.1106 | **15.1%** |
| GPT-3.5-Turbo | $0.0050 | $0.0037 | **15.1%** |
| Claude-3.5-Sonnet | $0.0132 | $0.0097 | **15.2%** |
| Gemini-1.5-Pro | $0.0169 | $0.0124 | **15.3%** |
| Llama-3-8B | $0.0023 | $0.0017 | **15.3%** |

### Performans Metrikleri

- 📊 **Ortalama Encode süresi**: 1.28ms
- ⚡ **Ortalama Decode süresi**: 1.11ms
- 🧠 **Ortalama Query süresi**: 0.16ms
- 📈 **Encode throughput**: 4.8 MB/s
- 🚀 **Smart encode**: Regular'den **50.9%** daha hızlı

## Nasıl Kullanılır?

### CLI ile Benchmark Çalıştırma

```bash
# Format karşılaştırması
node bench/run-benchmarks.js

# Token analizi
node bench/token-analysis.js

# Performans analizi
node bench/performance-analysis.js
```

### Manuel Dönüşüm

```bash
# JSON'dan TONL'e
tonl encode examples/benchmark-data/medium-ecommerce.json --out ecommerce.tonl --stats

# Smart encoding ile
tonl encode examples/benchmark-data/medium-ecommerce.json --out ecommerce-smart.tonl --smart --stats

# TONL'dan JSON'a
tonl decode examples/benchmark-data/medium-ecommerce.tonl --out ecommerce-decoded.json
```

### Programatik Kullanım

```javascript
import { encodeTONL, decodeTONL, encodeSmart } from 'tonl';

// Veri yükleme
const data = JSON.parse(fs.readFileSync('data.json', 'utf8'));

// TONL encoding
const tonl = encodeTONL(data);
const tonlSmart = encodeSmart(data);

// TONL decoding
const decoded = decodeTONL(tonl);
```

## Öneriler

### ✅ TONL Formatını Kullanın Eğer:
- **Boyut tasarrufu** önemli (>20% kazanç)
- **Token maliyetleri** yüksek (%15+ tasarruf)
- **Okunabilirlik** ve **LLM uyumluluğu** gerekli
- **Büyük veri setleri** ile çalışıyorsunuz

### ⚠️ Dikkat Edilmesi Gerekenler:
- **Küçük dosyalarda** (<1KB) performans düşüklüğü
- **Memory kullanımı** büyük dosyalarda artabilir
- **Query performansı** optimize edilebilir

### 🏆 En İyi Sonuçlar:
- **large-healthcare.json**: %30.7 byte tasarrufu
- **Llama-3-8B modeli**: %15.3 maliyet tasarrufu
- **Smart encoding**: %50.9 daha hızlı

## Teknik Detaylar

### Token Estimation
- **GPT modelleri**: ~4 karakter = 1 token
- **Claude modelleri**: ~4.5 karakter = 1 token
- **Türkçe metinler**: Karakter/token oranı biraz daha düşük

### Performans Testleri
- **İterasyon sayısı**: Dosya boyutuna göre dinamik (20-100)
- **Memory ölçümü**: Heap kullanım bazında
- **Throughput**: MB/s cinsinden hesaplanır

### Kalibrasyon
Bu benchmark sonuçları bu spesifik veri setleri içindir. Farklı veri tipleri ve yapıları farklı sonuçlar verebilir. Kendi verilerinizle test yapmanız önerilir.
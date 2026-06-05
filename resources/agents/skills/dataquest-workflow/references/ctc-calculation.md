# CtC API Scope 陷阱備忘錄

## 問題

`query_metrics_ctc` 回傳的 CtC 數值會因為 scope 設定不同而產生完全不同的語義。

## 正確用法 vs 錯誤用法

| | 正確 ✅ | 錯誤 ❌ |
|---|---|---|
| **呼叫方式** | `gls=421, group_by=Manufacturer` | `gls=421, vendor_code=FUJMY` |
| **Scope** | GL 全體 | 單一 vendor |
| **分母** | GL LY | Vendor LY |
| **語義** | 該 vendor 對 GL 整體 YoY 的貢獻 | 該 vendor 自身的 YoY 變化率 |
| **富士フイルム Revenue 範例** | (1,404M - 1,058M) / 5,766M × 10000 = **600 bps** | (1,404M - 1,058M) / 1,058M × 10000 = **3,270 bps** |
| **倍率差** | — | ≈ GL_LY / vendor_LY 倍（此例 5.5x） |

用 `vendor_code` 單獨呼叫時，scope 縮到只有一家 vendor，沒有其他 vendor 可以「分解」，API 就退化成回傳 vendor 自身的 YoY%。數值本身沒錯，但語義不是「對 GL 的貢獻」。

## CtC 計算公式（依 metric 類型）

### 1. Absolute Metric（OPS, Revenue, Units, GV）

不需 Rate/Mix 分解，直接差分：

```
CtC (bps) = (Vendor_TY − Vendor_LY) / GL_LY × 10,000
```

### 2. Percentage Metric（Net PPM, CVR, ROOS）

需要 Rate + Mix 分解：

```
w_TY = Vendor_Rev_TY / GL_Rev_TY    （TY revenue share）
w_LY = Vendor_Rev_LY / GL_Rev_LY    （LY revenue share）

Rate = w_TY × (PPM_vendor_TY − PPM_vendor_LY)
Mix  = (w_TY − w_LY) × (PPM_vendor_LY − PPM_GL_LY)

CtC (bps) = (Rate + Mix) × 100
```

- Rate = vendor 自身 PPM 變化的影響（PPM 改善/惡化）
- Mix = revenue share 變化的影響（佔比增減 × 與 GL 平均的差距）
- 分母依 metric 而異：PPM → Revenue, CVR → GV

### 3. Average Metric（ASP, AUP, CPPU）

同 Percentage 的 Rate + Mix 結構，但 w = Units share（不是 Revenue share）。

## 驗算方法

**必須滿足：**

```
Σ (所有 vendor CtC) = GL_TY metric − GL_LY metric
```

- Revenue CtC 合計 = GL Revenue YoY 變化額 / GL_LY × 10000
- Net PPM CtC 合計 = GL PPM TY − GL PPM LY（in bps）

如果不一致，代表有 vendor 遺漏或計算錯誤。

## 實際驗算結果（GL421 Camera Q1 2026）

| 項目 | JBP 10社合計 | Others | GL Total |
|---|---:|---:|---:|
| Revenue CtC (bps) | +1,496 | +223 | **+1,719** ✅ |
| Net PPM CtC (bps) | -56 | +17 | **-39** ✅ |

## DuckDB 計算範例 SQL

```sql
WITH vendors AS (
    SELECT name, rev_ty, rev_ly, ppm_ty, ppm_ly
    FROM vendor_data  -- TY/LY 實績
),
gl AS (
    SELECT gl_rev_ty, gl_rev_ly, gl_ppm_ty, gl_ppm_ly
    FROM gl_totals
)
SELECT
    v.name,
    -- Revenue CtC
    ROUND((v.rev_ty - v.rev_ly) / g.gl_rev_ly * 10000, 0) AS rev_ctc_bps,
    -- Net PPM CtC (Rate + Mix)
    ROUND((
        (v.rev_ty / g.gl_rev_ty) * (v.ppm_ty - v.ppm_ly)
        + (v.rev_ty / g.gl_rev_ty - v.rev_ly / g.gl_rev_ly)
          * (v.ppm_ly - g.gl_ppm_ly)
    ) * 100, 0) AS ppm_ctc_bps
FROM vendors v CROSS JOIN gl g
```

## Edge Case: LY = 0 / NULL 的處理（新規 segment）

### 原則

1. **FULL OUTER JOIN 確保 TY/LY segment 集合一致** — 新規 segment（TY 有、LY 無）和廢窗 segment（LY 有、TY 無）都必須出現在計算池中。
2. **NULL 補 0**（volume/amount 本位）或用 `COALESCE(LY, TY)` 替代（ratio metric 本位）。

### Non-ratio metric（Absolute: OPS, Revenue, Units, GV）

| 情境 | 處理 | CtC 結果 |
|---|---|---|
| Vendor_LY = NULL 或 0 | 補 0 | `Vendor_TY / GL_LY × 10,000` → TY 全額算正向貢獻 |
| Vendor_TY = NULL 或 0 | 補 0 | `−Vendor_LY / GL_LY × 10,000` → LY 全額算負向（廢窗效果） |

### Ratio metric（Percentage / Average: PPM, CVR, ASP, AUP）

標準做法：

```
Mix = (w_TY − w_LY) × (COALESCE(Metrics_LY, Metrics_TY) − Metrics_Total_LY) × 10,000
Rate = (Metrics_TY − COALESCE(Metrics_LY, Metrics_TY)) × w_TY × 10,000
```

| 情境 | coalesce 效果 | Rate | Mix |
|---|---|---|---|
| 新規 segment（LY 無數據） | `COALESCE(NULL, TY) = TY` | = 0（TY − TY） | 全部貢獻歸 Mix |
| 廢窗 segment（TY 無數據） | w_TY = 0 | = 0（w_TY = 0） | = (0 − w_LY) × (LY − Total_LY) |

**語義：** 新規 segment 沒有「自身改善/惡化」（Rate = 0），只有「構成比變化」（Mix）的影響。

### DuckDB 實作範例（含 edge case 處理）

```sql
WITH ty AS (
    SELECT name, rev AS rev_ty, ppm AS ppm_ty, units AS units_ty
    FROM vendor_data_ty
),
ly AS (
    SELECT name, rev AS rev_ly, ppm AS ppm_ly, units AS units_ly
    FROM vendor_data_ly
),
combined AS (
    SELECT
        COALESCE(ty.name, ly.name) AS name,
        COALESCE(ty.rev_ty, 0) AS rev_ty,
        COALESCE(ly.rev_ly, 0) AS rev_ly,
        ty.ppm_ty,
        ly.ppm_ly,
        COALESCE(ty.units_ty, 0) AS units_ty,
        COALESCE(ly.units_ly, 0) AS units_ly
    FROM ty FULL OUTER JOIN ly ON ty.name = ly.name
),
gl AS (
    SELECT
        SUM(rev_ty) AS gl_rev_ty, SUM(rev_ly) AS gl_rev_ly,
        SUM(units_ty) AS gl_units_ty, SUM(units_ly) AS gl_units_ly
    FROM combined
)
SELECT
    c.name,
    -- Revenue CtC: NULL/0 已由 COALESCE 處理
    ROUND((c.rev_ty - c.rev_ly) / g.gl_rev_ly * 10000, 0) AS rev_ctc_bps,
    -- PPM CtC (Rate + Mix): coalesce 讓新規 segment Rate=0
    ROUND((
        (c.rev_ty / g.gl_rev_ty)
        * (c.ppm_ty - COALESCE(c.ppm_ly, c.ppm_ty))
        + (c.rev_ty / g.gl_rev_ty - c.rev_ly / g.gl_rev_ly)
          * (COALESCE(c.ppm_ly, c.ppm_ty) - gp.gl_ppm_ly)
    ) * 100, 0) AS ppm_ctc_bps
FROM combined c
CROSS JOIN gl g
CROSS JOIN gl_ppm gp
```

### 驗算注意

- Σ rev_ctc_bps 仍必須 = GL Revenue YoY delta / GL_LY × 10000
- Σ ppm_ctc_bps 仍必須 = GL_PPM_TY − GL_PPM_LY（in bps）
- 新規 segment 的 ppm_ctc_bps 全部來自 Mix（Rate = 0）

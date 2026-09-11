# Dataset

## Source
**Hugging Face — AliArshad/Bugzilla_Eclipse_Bug_Reports_Dataset**
https://huggingface.co/datasets/AliArshad/Bugzilla_Eclipse_Bug_Reports_Dataset

A processed version of the Eclipse/Mozilla Bugzilla dataset associated with:
> A. Lamkanfi, J. Pérez, S. Demeyer. "The Eclipse and Mozilla Defect Tracking Dataset: A Genuine Dataset for Mining Bug Information." MSR 2013 (Mining Challenge).

## Files
| File | Rows | Description |
|---|---|---|
| `bugzilla_eclipse_raw.csv` | 88,682 | Original download, unchanged. Columns: Project, Bug ID, Severity Label, Resolution Status, Short Description |

### What the raw data actually contains (verified)
Despite the dataset name, it mixes **Mozilla and Eclipse** projects:
| Project | Rows | Ecosystem |
|---|---|---|
| Core | 46,916 | Mozilla |
| Platform | 13,842 | Eclipse |
| Firefox | 11,737 | Mozilla |
| JDT | 5,891 | Eclipse |
| CDT | 4,228 | Eclipse |
| Thunderbird | 3,663 | Mozilla |
| Bugzilla | 2,405 | Mozilla |

- Resolution Status: **all 88,682 are FIXED** (only resolved bugs).
- Raw severity labels: normal 72,170 · critical 5,936 · major 4,573 · minor 3,125 · trivial 2,080 · blocker 798 (no `enhancement` rows present).
- Raw → cleaned: 620 rows removed (invalid / empty / duplicate).
| `severity_dataset.csv` | 88,062 | Cleaned. Columns: `title`, `description`, `severity` |

## Transformation (raw → cleaned)
- Severity mapping: blocker, critical → **Critical** · major → **High** · normal → **Medium** · minor, trivial → **Low**
- Removed: `enhancement` and excluded/invalid records
- `title` = Short Description. The raw data has no long description, so `description` repeats the title (the model effectively learns from titles only).

## Class distribution (cleaned, after training-time de-duplication: 87,959 rows)
| Class | Rows | Share |
|---|---|---|
| Medium | 71,627 | 81.4% |
| Critical | 6,618 | 7.5% |
| Low | 5,180 | 5.9% |
| High | 4,534 | 5.2% |

Heavily imbalanced → report **macro-F1**, not accuracy (an always-"Medium" baseline scores 81% accuracy).

## Severity model results (TF-IDF 1–2 grams + Logistic Regression, class_weight=balanced, 80/20 stratified split, seed 42)
| | Precision | Recall | F1 |
|---|---|---|---|
| Critical | 0.54 | 0.73 | 0.62 |
| High | 0.14 | 0.37 | 0.20 |
| Medium | 0.90 | 0.67 | 0.77 |
| Low | 0.17 | 0.44 | 0.25 |
| **Macro avg** | 0.44 | 0.55 | **0.46** |

Accuracy 0.646. Full metrics: `backend/reports/severity_metrics.json`, `confusion_matrix.png`.

## Known limitations
1. **Title-only text** — no long descriptions in the source.
2. **Class imbalance** — 81% Medium; High and Low are weakly separated.
3. **Domain shift** — Mozilla/Eclipse desktop & IDE bugs vs. the web-application bugs used in the demo.
5. **Only FIXED bugs** — may bias toward reports that were clear enough to resolve.
4. Duplicate-detection corpus uses a 5,000-row random sample (seed 42) of this dataset.

## Other files
- `module_team_map.csv` — 9 modules → owning team + keywords (knowledge base for the Assignment agent).
- `bootstrap_bugs.csv` — 60 hand-written dev-only bugs. **Not used for any reported result.**

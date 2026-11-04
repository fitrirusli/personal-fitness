# Malaysian food references

The default food picker prioritizes 25 familiar local references, reference plates, and drinks. An additional 20 USDA ingredient records remain searchable. All personal meal records keep their composition snapshots; changing the public catalog does not rewrite history.

## Composition

Fourteen foods use explicit food IDs and per-100-g composition from Ministry of Health Malaysia's MyFCD 1997 collection. Names stay familiar: nasi putih, nasi lemak rice preparation, nasi ayam, nasi goreng, mee goreng, roti canai, roti telur, kuah dhal, ayam goreng, two ikan kembung preparations, karipap, karipap pusing, and pisang goreng.

Examples of primary records: [cooked rice 101014](https://myfcd.moh.gov.my/myfcd97/index.php/site/detail_product/101014/0/10/rice/0/0), [ayam goreng 222012](https://myfcd.moh.gov.my/myfcd97/index.php/site/detail_product/222012/0/10/-1/0/0/), [roti canai 221023](https://myfcd.moh.gov.my/index.php/1997-food-compositon-database/613-%28roti-canai%29.html.tmp), [kuah dhal 221025](https://myfcd.moh.gov.my/myfcd97/index.php/site/detail_product/221025/0/10/-1/0/0/), [ikan kembung 223011](https://myfcd.moh.gov.my/index.php/1997-food-compositon-database/643-indian-mackerel%2C-fried-%28ikan-kembong-goreng%29.html.tmp), and [karipap 212006](https://myfcd.moh.gov.my/myfcd97/index.php/site/detail_product/212006/0/10/-1/0/0/).

These are historical reference measurements. During verification some live MyFCD routes were unavailable; source values were checked against indexed primary pages. Vitamin D and B12 are not supplied by these records, so they stay null. Historical `Fibre` values are retained separately as `referenceFibreG`; the app does not assume the historical measurement is equivalent to total dietary fibre for modern intake comparisons.

Four familiar ingredient names (telur rebus, cooked tempe reference, pisang, and skinless roasted chicken breast) are aliases for the existing USDA records. Their provenance remains USDA; they are not relabeled as Malaysian laboratory measurements. Fried tempe with added oil needs its own recipe or reference.

## Portions

Reference portions make logging easier: scoops, pieces, plates, and cups. They are estimates, with gram weights shown and editable. Edible weights exclude bones/shells where specified. Fractions multiply the reference weight; they do not change the underlying nutrient composition.

Prepared meals vary with oil, coconut milk, gravy, sugar, the cut of meat, and serving size. `Nasi lemak (rice preparation)` is a component reference; do not assume it includes every lauk, egg, sambal, or drink. Avoid double-counting a whole reference plate and its ingredients.

## Calculated plates

`Nasi putih + ayam goreng` combines 152 g rice and 90 g edible fried chicken. `Roti canai + kuah dhal` combines 95 g roti and 80 g dhal. They are calculated reference plates, not measured restaurant meals. Their ingredient quantities are disclosed in the picker. Nutrients stay unknown if any component is missing that value.

## Drinks

Five drinks use the [MOH Bank Kalori Makanan](https://jknselangor.moh.gov.my/documents/pdf/2016/info/bank_kalori_makanan.pdf). This source supplies energy but not complete macros or micronutrients. Protein, carbs, and fat therefore remain unknown, including for milk-containing drinks.

Teh susu, sirap bandung, and sirap limau use the listed reference serving weights. The two teh tarik entries explicitly describe a reference recipe calculated from the source's tea and milk entries: 200 g tea + 5 g evaporated milk + either 29 g or 19 g condensed milk. A shop's actual cup may differ. Energy-only drinks never count as complete protein/macronutrient coverage.

All entries retain a source link. They do not certify halal status, allergens, cross-contact, or an individual restaurant's recipe.

Captured from public GET responses on 2026-11-28 before polling began (UTC+8).
Source page: https://elect.setn.com/2026/vote
The page's refresh()/getUrl() code declares:
- mayor: https://elect.setn.com/2026/vote/getsixmunicipalitiesmayor (captured with element=main; same candidate fragment)
- north/central/south/east/offshore: https://elect.setn.com/2026/vote/getcountymayor?reg=REGION

These are unmodified source fragments. They contain 22 districts and 81 candidates, with zero placeholders before counting. Tests that replace a votes-number value are explicitly synthetic scenarios, not observed results or predictions.

`setn-council-taipei-1.html` is the unmodified public Taipei council District 1 fragment from `/2026/vote/getcouncilmember?element=sub&reg=six-cities&city=taipei-city&dist=81010000`, captured 2026-11-28. Zero counts remain placeholders until actual reporting; no winner flag is inferred.

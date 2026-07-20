# JMA VPWP50 test excerpt

`vpwp50-official-excerpt.xml` is a small UTF-8 excerpt derived from the JMA
**気象警報・注意報時系列情報（Ｒ０６）解説資料** in the 2026-07-07 manual
set, official sample `81_01_01_260129_VPWP50.xml` in the 2026-03-26 sample set,
and `code.Significancy` in the 2026-07-07 code table. It was checked on
2026-07-20.

The excerpt retains the official
`MeteorologicalInfos/TimeSeriesInfo/Item/Kind/Property/Type/SignificancyPart/Base`
structure. In particular, `Base/Local/AreaName/Significancy` is retained for
types that may have multiple local divisions. Repeated forecast periods,
quantitative properties, offices, and unrelated phenomena were removed, and
the municipality was reduced to the test municipality.

The fixed clear values in the file are `01/注意報級未満` for wind, waves and
thunder, and `11/警戒レベル２未満` for inundation, landslide and storm surge.
Tests create warning/advisory, `00` (no value), missing, duplicate, and
inconsistent variants by making small in-memory replacements in this text;
these variants are not copied from production constants. Large-size cases are
also generated in memory and are not fixtures.

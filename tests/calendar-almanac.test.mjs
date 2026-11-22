import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {calendarText,lunarDate,lunarDayName,parseSolarTerms,dayAlmanac,solarTermDescription} from '../js/calendar-almanac.js';
import {holidayDates} from '../js/calendar-model.js';
assert.equal(lunarDate('2026-02-17').full,'2026（丙午）年 正月初一');
assert.equal(lunarDate('2026-02-16').year,'2025');
assert.equal(lunarDate('2025-07-25').short,'閏六月');assert.equal(lunarDate('2025-07-25',true).short,'闰六月');
assert.equal(lunarDate('2026-11-22').dayName,'十四');assert.equal(lunarDate('2026-12-25').full,'2026（丙午）年 十一月十七');
assert.equal(lunarDayName(10),'初十');assert.equal(lunarDayName(20),'二十');assert.equal(lunarDayName(30),'三十');
assert.deepEqual(parseSolarTerms('公曆日期 農曆日期 星期 節氣\r\n2026年1月5日          十七        星期一      小寒    \r\n2026年1月6日          十八        星期二\r\n2026年11月22日         十四        星期日      小雪'),{'2026-01-05':'小寒','2026-11-22':'小雪'});
const holidays=holidayDates(JSON.parse(await readFile(new URL('../data/hk-public-holidays.json',import.meta.url),'utf8')));
const terms=JSON.parse(await readFile(new URL('../data/calendar/2026.json',import.meta.url),'utf8')).terms;
assert.equal(dayAlmanac('2026-12-25',holidays,terms,true).subtitle,'圣诞节');
assert.equal(dayAlmanac('2026-11-22',holidays,terms,true).subtitle,'小雪');
assert.equal(dayAlmanac('2026-11-23',holidays,terms,true).subtitle,'十五');
assert.equal(dayAlmanac('2026-11-09',holidays,terms,true).subtitle,'十月');
const sunday=new Map([['2026-11-29','星期日']]);assert.equal(dayAlmanac('2026-11-29',sunday,terms).subtitle,'廿一');
// An actual named public holiday on Sunday is still identified; only generic Sunday labels are omitted.
assert.equal(dayAlmanac('2026-11-29',new Map([['2026-11-29','聖誕節']]),terms).holiday,'聖誕節');
for(let year=2025;year<=2030;year++){
 const data=JSON.parse(await readFile(new URL('../data/calendar/'+year+'.json',import.meta.url),'utf8'));
 assert.equal(Object.keys(data.terms).length,24);
 for(const [key,name]of Object.entries(data.terms)){assert.ok(key.startsWith(year+'-'));assert.ok(solarTermDescription(name));assert.ok(solarTermDescription(name,true));}
}
assert.equal(terms['2026-02-04'],'立春');assert.equal(terms['2026-06-21'],'夏至');assert.equal(terms['2026-12-22'],'冬至');
assert.equal(calendarText('香港特別行政區成立紀念日',true),'香港特别行政区成立纪念日');
assert.equal(calendarText('聖誕節後第一個周日',true),'圣诞节后第一个周日');
console.log('PASS: lunar new year boundaries, leap lunar month, lunar day labels, six official 24-term calendars, holiday/term/lunar priority, Sunday omission and simplified/traditional names.');

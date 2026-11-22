export function normalizeCities(value){
 if(!Array.isArray(value)||value.length>20)throw new Error('城市列表最多 20 个');
 return value.map(x=>{if(!x||typeof x.name!=='string'||!x.name.trim()||x.name.length>100||typeof x.country!=='string'||x.country.length>100||!Number.isFinite(x.latitude)||Math.abs(x.latitude)>90||!Number.isFinite(x.longitude)||Math.abs(x.longitude)>180)throw new Error('城市资料不正确');return {name:x.name,country:x.country,latitude:x.latitude,longitude:x.longitude};});
}

export const CAMERA_BACKGROUND_KEY='navi_camera_background';
export function parseCameraPreference(value) {
    if(value===null || value===undefined)return null;
    const data=typeof value==='string'?JSON.parse(value):value;
    if(!data || Array.isArray(data) || !['hko','traffic','webcast','webcast-live','bing'].includes(data.source) || typeof data.id!=='string' || !/^[A-Z0-9]{2,12}$/.test(data.id) || (data.refresh!==undefined && typeof data.refresh!=='boolean'))throw new Error('摄影机背景设置不正确');
    if(data.source==='bing' && data.id!=='DAILY')throw new Error('Bing 背景设置不正确');
    if(data.source.startsWith('webcast') && !['HK','KL','TW','TM','BBI'].includes(data.id))throw new Error('交通直播区域不正确');
    return {source:data.source,id:data.id,refresh:data.source==='webcast-live' || data.refresh!==false};
}
export function cameraImageUrl(source,id,thumbnail=false) {
    parseCameraPreference({source,id});
    if(source.startsWith('webcast'))return '/api/webcast?area='+id;
    if(source==='bing')return '/api/bing';
    return source==='hko'?'https://www.hko.gov.hk/wxinfo/aws/hko_mica/'+id.toLowerCase()+'/latest_'+(thumbnail?id+'_thumb':'HD_'+id)+'.jpg':'https://tdcctv.data.one.gov.hk/'+id+'.JPG';
}
export const cameraRefreshInterval=source=>source==='bing'?3600000:source==='hko'?180000:120000;

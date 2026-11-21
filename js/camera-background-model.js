export const CAMERA_BACKGROUND_KEY='navi_camera_background';
export function parseCameraPreference(value) {
    if(value===null || value===undefined)return null;
    const data=typeof value==='string'?JSON.parse(value):value;
    if(!data || Array.isArray(data) || !['hko','traffic'].includes(data.source) || typeof data.id!=='string' || !/^[A-Z0-9]{2,12}$/.test(data.id) || (data.refresh!==undefined && typeof data.refresh!=='boolean'))throw new Error('摄影机背景设置不正确');
    return {source:data.source,id:data.id,refresh:data.refresh!==false};
}
export function cameraImageUrl(source,id,thumbnail=false) {
    parseCameraPreference({source,id});
    return source==='hko'?'https://www.hko.gov.hk/wxinfo/aws/hko_mica/'+id.toLowerCase()+'/latest_'+(thumbnail?id+'_thumb':'HD_'+id)+'.jpg':'https://tdcctv.data.one.gov.hk/'+id+'.JPG';
}
export const cameraRefreshInterval=source=>source==='hko'?180000:120000;

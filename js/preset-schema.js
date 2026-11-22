import {validateVault} from './calendar-vault-format.js';
import {normalizeCities} from './weather-cities.js';
import {parseCameraPreference} from './camera-background-model.js';
// Preferences and an optional encrypted calendar vault travel between devices; auth cookies, plaintext credentials and live caches do not.
export const PRESET_KEYS = ['bp_v7','custom_engines','last_engine','theme_mode','custom_rss','navi_city_stocks','navi_city_feed','navi_rss_expansion_v1','navi_language','hko_rain_area','navi_aqhi_station','navi_camera_background','navi_weather_cities','navi_calendar_preferences','navi_calendar_vault'];
export const COOKIE_KEYS = ['homepage_bg'];
export const MAX_PRESET_BYTES = 180000;
export function sanitizePreset(input) {
    if (!input || typeof input !== 'object' || !input.localStorage || typeof input.localStorage !== 'object' || Array.isArray(input.localStorage)) throw new Error('预设格式不正确');
    const result = {version:1,localStorage:{},cookies:{}};
    for (const key of PRESET_KEYS) {
        const value = input.localStorage[key];
        if (value !== undefined && value !== null && typeof value !== 'string') throw new Error('预设内容不正确');
        result.localStorage[key] = value ?? null;
    }
    for (const key of COOKIE_KEYS) {
        const value = input.cookies?.[key];
        if (value !== undefined && value !== null && typeof value !== 'string') throw new Error('背景预设不正确');
        result.cookies[key] = value ?? null;
    }
    for (const key of ['bp_v7','custom_rss','navi_city_stocks','navi_city_feed','custom_engines']) {
        const value = result.localStorage[key];
        if (value !== null) {
            const parsed = JSON.parse(value);
            if (!parsed || typeof parsed !== 'object') throw new Error('预设设置格式不正确');
            if (['bp_v7','custom_rss'].includes(key) && !Array.isArray(parsed)) throw new Error('预设列表格式不正确');
            if (key === 'bp_v7' && !parsed.every(item=>item && ['name','url','icon'].every(field=>typeof item[field] === 'string'))) throw new Error('书签格式不正确');
            if (key === 'custom_rss' && !parsed.every(item=>typeof item === 'string')) throw new Error('RSS 格式不正确');
            if (key === 'navi_city_stocks' && (!Array.isArray(parsed.ids) || !Array.isArray(parsed.symbols) || ![...parsed.ids,...parsed.symbols].every(item=>typeof item === 'string'))) throw new Error('自选股票格式不正确');
            if (['navi_city_feed','custom_engines'].includes(key) && Array.isArray(parsed)) throw new Error('预设设置格式不正确');
        }
    }
    if(result.localStorage.navi_calendar_vault!==null){const v=validateVault(JSON.parse(result.localStorage.navi_calendar_vault));result.localStorage.navi_calendar_vault=JSON.stringify(v);}
    if(result.localStorage.navi_calendar_preferences!==null){const p=JSON.parse(result.localStorage.navi_calendar_preferences);if(!p||typeof p!=='object'||Array.isArray(p)||Object.keys(p).some(k=>!['google','microsoft','icloud','canvas'].includes(k)))throw new Error('日历偏好不正确');for(const x of Object.values(p))if(!x||typeof x.account!=='string'||x.account.length>254||!Array.isArray(x.calendars)||x.calendars.length>100||x.calendars.some(id=>typeof id!=='string'||id.length>3000))throw new Error('日历偏好不正确');}
    if(result.localStorage.navi_weather_cities!==null)result.localStorage.navi_weather_cities=JSON.stringify(normalizeCities(JSON.parse(result.localStorage.navi_weather_cities)));
    if(result.localStorage.navi_camera_background!==null)result.localStorage.navi_camera_background=JSON.stringify(parseCameraPreference(result.localStorage.navi_camera_background));
    if (result.localStorage.custom_rss !== null) result.localStorage.navi_rss_expansion_v1 = '1';
    if (new TextEncoder().encode(JSON.stringify(result)).length > MAX_PRESET_BYTES) throw new Error('预设超过 180 KB，请减小背景或配置数据');
    return result;
}

import {sanitizePreset} from './preset-schema.js?v=music-v10';

// Change only the vault in the latest cloud revision, never upload local preferences.
export async function removeCloudCalendarVault(request) {
    for (let attempt=0; attempt<3; attempt++) {
        const cloud=await request('pull');
        if (!cloud.exists) return {exists:false};
        const before=sanitizePreset(cloud.preset);
        if (before.localStorage.navi_calendar_vault===null) return {...cloud,before,preset:before};
        const preset=sanitizePreset({...before,localStorage:{...before.localStorage,navi_calendar_vault:null}});
        try {
            const result=await request('push',{preset,revision:cloud.revision});
            return {...cloud,...result,before,preset};
        } catch (error) {
            if (error.status!==409 || attempt===2) throw error;
        }
    }
}

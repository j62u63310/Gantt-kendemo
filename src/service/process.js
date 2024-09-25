import { appId } from '../config/AppConfig';

export const fetchOrder = async (query) => {
    const response = await kintone.api(kintone.api.url('/k/v1/records', true), 'GET', {
        app: appId.planOrderAppId,
        query: `${query}`,
    });
    return response.records;
}

export const fetchAllData = (appID, query = '', type) => async (dispatch) => {
    let allRecords = [];
    let offset = 0;
    const limit = 500;
    try {
        while (true) {
            const response = await kintone.api(kintone.api.url('/k/v1/records', true), 'GET', {
                app: appID,
                query: `${query} limit ${limit} offset ${offset}`,
            });

            allRecords = allRecords.concat(response.records);
            offset += limit;
            if (response.records.length < limit) {
                break;
            }
        }
        dispatch({
            type: type,
            payload: allRecords,
        });
    } catch (error) {
        console.error(`fetchData: ${error}`);
    }
};
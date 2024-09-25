import React, { useEffect } from 'react';
import { Select } from 'antd';
import { useDispatch } from 'react-redux';

import GanttChart from './components/GanttChart';
import { fetchAllData } from './service/process';
import { appId, fieldCodes } from './config/AppConfig';

const App = () => {

  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(fetchAllData(kintone.app.getId(), "", 'SET_行事曆_DATA'))
    dispatch(fetchAllData(appId.標籤AppId, `order by ${fieldCodes.最後取用時間} desc`, 'SET_標籤_DATA'))
  }, [dispatch]);

  return (
    <div>
      <GanttChart/>
    </div>
  );
};

export default App;

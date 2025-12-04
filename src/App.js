import React, { useEffect } from 'react';
import { Select } from 'antd';
import { useDispatch } from 'react-redux';

import GanttChart from './components/GanttChart';
import { fetchAllData, fetchAllUser } from './service/process';
import { appId, fieldCodes } from './config/AppConfig';

const App = () => {

  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(fetchAllData(kintone.app.getId(), `order by ${fieldCodes.問題標題} asc`, 'SET_行事曆_DATA'));
    dispatch(fetchAllData(appId.標籤AppId, `order by ${fieldCodes.最後取用時間} desc`, 'SET_標籤_DATA'));
    dispatch(fetchAllUser("SET_登入帳號_DATA"));
  
    /* const style = document.createElement('style');
    style.innerHTML = `
      html::-webkit-scrollbar, 
      body::-webkit-scrollbar {
        display: none;
      }
      
      html {
        scrollbar-width: none;
      }
    `;
    document.head.appendChild(style);
    window.scrollTo({
      top: 850,
      behavior: 'smooth'
    }); */
  }, [dispatch]);

  return (
    <div>
      <GanttChart/>
    </div>
  );
};

export default App;

import React, { useEffect, useRef } from 'react';
import 'dhtmlx-gantt/codebase/dhtmlxgantt.css';

import gantt from 'dhtmlx-gantt';
import { useSelector } from 'react-redux';
import { fieldCodes, 本地化 } from '../config/AppConfig';
import "../styles/GanttChart.css"

const GanttChart = () => {
  const ganttContainer = useRef(null);
  const 標籤資料 = useSelector((state) => state.標籤);
  const 行事曆資料 = useSelector((state) => state.行事曆);

  useEffect(() => {
    //////////////////////////////////////////////////////
    //                     設定                         //
    /////////////////////////////////////////////////////
    // 設定日期格式
    gantt.config.xml_date = '%Y-%m-%d';
    gantt.config.date_format = '%Y-%m-%d';
    gantt.config.date_grid = '%Y年%m月%d日';

    // 設定時間軸單位和格式
    gantt.config.scale_unit = "day";
    gantt.config.date_scale = "%m月%j日";
    gantt.config.subscales = [
      { unit: "month", step: 1, date: "%Y年 %n月" }
    ];

    // 自定義時間軸日期格式
    gantt.templates.scale_date = function(date) {
      return gantt.date.date_to_str("%m月%j日")(date);
    };

    // 自定義任務編輯器中的日期範圍顯示
    gantt.templates.lightbox_header = function(start, end, task) {
      var formatFunc = gantt.date.date_to_str("%Y年%m月%d日");
      return task.text + ", " + formatFunc(start) + " - " + formatFunc(end);
    };

    // 唯讀
    gantt.config.readonly = true;

    //展開全部
    gantt.config.open_tree_initially = true;

    // 設定繁體中文配置
    gantt.locale = 本地化;

    // 顯示任務名稱
    /* gantt.templates.task_text = function(start, end, task){
      return task.name;
    }; */

    // 根據訂單種類分類顏色
    gantt.templates.task_class = function(start, end, task){
      switch (task.order_type) {
        case 'tags':
          return 'tags';
        case 'A-發行':
          return 'A-發行';
        case 'B-進行中':
          return 'B-進行中';
        case 'C-驗收( V&V )':
          return 'C-驗收';
        case 'F-結案':
          return 'F-結案';
        case 'P-暫緩':
          return 'P-暫緩';
        case 'R-返工':
          return 'R-返工';
        default:
          return '';
      }
    };

    gantt.templates.tooltip_text = function(start, end, task) {
      return `<b>問題編號:</b> ${task.number}<br/>
              <b>問題標題:</b> ${task.text}<br/>
              <b>處理人員:</b> ${task.handler}<br/>
              <b>作業狀態:</b> ${task.order_type}<br/>`;
    };

    gantt.config.tooltip_timeout = 0;

    gantt.plugins({ tooltip: true });

    // 初始化甘特圖
    gantt.init(ganttContainer.current);

    //////////////////////////////////////////////////////
    //                     彙整資料                     //
    /////////////////////////////////////////////////////

    const recordData = [];
    const recordLinks = [];

    const 標籤ids = {};

    for (const record of 標籤資料){
        const 標籤 = record[fieldCodes.標籤].value;
        if(!標籤ids[標籤]) {
            標籤ids[標籤] = recordData.length + 1;
            recordData.push({
                id: 標籤ids[標籤],
                text: 標籤,
                order_type: 'tags',
                open: false,
            });
        }
    }
  
    for (const record of 行事曆資料) {
        const 發行日 = new Date(record[fieldCodes.發行日].value);
        const 到期日 = record[fieldCodes.到期日]?.value ? new Date(record[fieldCodes.到期日].value) : null;
        const endDate = 到期日 ? 到期日 : new Date(發行日.getTime() + 24 * 60 * 60 * 1000);
        const tags = record[fieldCodes.標籤].value.split(',');

        const 處理人員 = record[fieldCodes.處理人員].value.map(user => user.name).join(', ');

        for (const tag of tags) {
            if (標籤ids[tag]) {
                recordData.push({
                    id: recordData.length + 1,
                    number: record["$id"].value,
                    text: `${record[fieldCodes.問題標題].value}`,
                    start_date: record[fieldCodes.發行日].value,
                    end_date: endDate.toISOString().split('T')[0],
                    handler: 處理人員,
                    order_type: record[fieldCodes.作業狀態_完成度]?.value,
                    progress: 1,
                    parent: 標籤ids[tag],
                });
            }
        }
    }
    

    // 定義任務數據
    const tasks = {
      data: recordData,
      links: recordLinks,
    };

    gantt.config.columns = [
      { name: 'text', label: '問題標題', width: 1000, tree: true },
    ];

    // 加載任務數據
    gantt.parse(tasks);

    return () => {
      gantt.clearAll();
    };
  }, [行事曆資料]);

  return <div ref={ganttContainer} style={{ width: '100%', height: '800px' }} />;
};

export default GanttChart;

import React, { useEffect, useState, useRef, useMemo } from 'react';
import 'dhtmlx-gantt/codebase/dhtmlxgantt.css';
import gantt from 'dhtmlx-gantt';
import { useSelector } from 'react-redux';
import { Select, DatePicker, ConfigProvider, Row, Col } from 'antd';
import { fieldCodes, 本地化 } from '../config/AppConfig';
import { UserOutlined, BorderlessTableOutlined, FlagOutlined, CalendarOutlined } from '@ant-design/icons';
import "../styles/GanttChart.css"

import dayjs from 'dayjs';
import 'dayjs/locale/zh-tw';
import zhTW from "antd/lib/locale/zh_TW";
import { combineSlices } from '@reduxjs/toolkit';
dayjs.locale('zh-tw');

const { Option } = Select;

const states = ['A-發行', 'B-進行中', 'C-驗收( V&V )', 'F-結案', 'P-暫緩', 'R-返工']

const GanttChart = () => {
  const ganttContainer = useRef(null);
  const 標籤資料 = useSelector((state) => state.標籤);
  const 行事曆資料 = useSelector((state) => state.行事曆);
  const 登入帳號 = useSelector((state) => state.登入帳號);
  const [selectedTag, setSelectedTag] = useState('(全部)');
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectState, setSelectState] = useState(states);
  const [selectedCategory, setSelectedCategory] = useState('(全部)');
  const [date, setDate] = useState(null);

  const uniqueTags = useMemo(() => {
    const allTags = 標籤資料.map((record) => record[fieldCodes.標籤類別].value);
    return Array.from(new Set(allTags)); // 去除重複的標籤類別
  }, [標籤資料]);

  const filteredCategories = useMemo(() => {
    const filteredData = selectedTag === '(全部)'
      ? 標籤資料 
      : 標籤資料.filter(record => record[fieldCodes.標籤類別].value === selectedTag);
    return filteredData;
  }, [selectedTag, 標籤資料]);

  useEffect(() => {
    const 登入 = kintone.getLoginUser();
    setSelectedUser(登入.code);
  }, []);

  const filterData = useMemo(() => {
    if (!行事曆資料) return [];
    let filteredData = 行事曆資料;

    if (date) {
      filteredData = filteredData.filter(record => {
        const 發行日 = dayjs(record[fieldCodes.發行日].value);
        return 發行日.isSame(date, 'day');
      });
    }

    if (selectedUser && selectedUser!= '所有人員(ALL)') {
      filteredData = filteredData.filter(record => 
        record[fieldCodes.處理人員].value.some(user => user.code === selectedUser)
      );
    }

    filteredData = filteredData.filter(record => 
      selectState.some(state => state === record[fieldCodes.作業狀態_完成度].value)
    );

    return filteredData;
  }, [行事曆資料, date, selectedUser, selectState]);

  // 使用 useMemo 優化任務資料的處理
  const tasks = useMemo(() => {
    const recordData = [];
    const recordLinks = [];
    const 標籤ids = {};

    for (const record of 標籤資料) {
      const 標籤 = record[fieldCodes.標籤].value;
      const 標籤類別 = record[fieldCodes.標籤類別].value;
      if (selectedTag !== '(全部)' && 標籤類別 !== selectedTag) continue;
      if (selectedCategory !== '(全部)' && 標籤 !== selectedCategory) continue;

      const 最後取用時間 = dayjs(record[fieldCodes.最後取用時間].value).format('YYYY/MM/DD HH:mm');
      if (!標籤ids[標籤]) {
        標籤ids[標籤] = recordData.length + 1;
        recordData.push({
          id: 標籤ids[標籤],
          text: `${標籤} ${最後取用時間}`,
          order_type: 'tags',
          open: true, // 確保任務節點是展開的
          type: gantt.config.types.project,
          duration: 0,
        });
      }
    }

    for (const record of filterData) {
      const 發行日 = dayjs(record[fieldCodes.發行日].value);
      const 到期日 = record[fieldCodes.到期日]?.value ? dayjs(record[fieldCodes.到期日].value) : null;
      const endDate = 到期日 ? 到期日 : 發行日.add(1, 'day');
      const tags = record[fieldCodes.標籤].value.split(',');

      const 處理人員 = record[fieldCodes.處理人員].value.map(user => user.name).join(', ');

      for (const tag of tags) {
        const trimmedTag = tag.trim();
        if (標籤ids[trimmedTag]) {
          recordData.push({
            id: recordData.length + 1,
            number: record["$id"].value,
            text: `${record[fieldCodes.問題標題].value}`,
            start_date: 發行日.format('YYYY-MM-DD'),
            end_date: endDate.format('YYYY-MM-DD'),
            handler: 處理人員,
            order_type: record[fieldCodes.作業狀態_完成度]?.value,
            progress: 1,
            parent: 標籤ids[trimmedTag],
          });
        }
      }
    }

    return {
      data: recordData,
      links: recordLinks,
    };
  }, [標籤資料, filterData, selectedTag, selectedCategory, selectedUser]);

  // 初始化甘特圖，只在組件掛載時執行一次
  useEffect(() => {
    //////////////////////////////////////////////////////
    //                     設定                         //
    /////////////////////////////////////////////////////

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

    // 展開全部
    gantt.config.open_tree_initially = true;

    // 設定繁體中文配置
    gantt.locale = 本地化;

    // 根據訂單種類分類顏色及圖標
    gantt.templates.task_class = function(start, end, task){
      switch (task.order_type) {
        case 'tags':
          return 'hidden-task';
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

    // 設置 tooltip 顯示
    gantt.templates.tooltip_text = function(start, end, task) {
      if(task.order_type == 'tags') return;
      return `<b>問題編號: </b> #ToDo-${task.number || ''}<br/>
              <b>問題標題: </b> ${task.text || ''}<br/>
              <b>處理人員: </b> ${task.handler || ''}<br/>
              <b>作業狀態: </b> ${task.order_type || ''}<br/>
              <b>開始時間: </b> ${dayjs(start).format('YYYY/MM/DD') || ''}<br/>
              <b>結束時間: </b> ${dayjs(end).format('YYYY/MM/DD') || ''}<br/>`;
    };

    gantt.config.tooltip_timeout = 0;

    gantt.plugins({ tooltip: true });

    // 調整問題標題的列寬度和顯示方式
    gantt.config.columns = [
      {
        name: 'text',
        label: '問題標題',
        width: '*', // 使用 '*' 使列自適應寬度
        tree: true,
        template: function (task) {
          let colorClass = '';

          switch (task.order_type) {
            case 'tags':
              colorClass = 'status-tags';
              break;
            case 'A-發行':
              colorClass = 'status-A-發行';
              break;
            case 'B-進行中':
              colorClass = 'status-B-進行中';
              break;
            case 'C-驗收( V&V )':
              colorClass = 'status-C-驗收';
              break;
            case 'F-結案':
              colorClass = 'status-F-結案';
              break;
            case 'P-暫緩':
              colorClass = 'status-P-暫緩';
              break;
            case 'R-返工':
              colorClass = 'status-R-返工';
              break;
            default:
              colorClass = 'status-default';
              break;
          }

          return `<div class='status-color ${colorClass}'></div>${task.text}`;
        },
      },
    ];

    // 隱藏不需要的列（如開始時間和持續時間）
    gantt.config.show_unscheduled = false;
    gantt.config.columns = gantt.config.columns.filter(column => column.name === 'text');

    // 初始化甘特圖
    gantt.init(ganttContainer.current);

    // 清理函數，當組件卸載時清除甘特圖
    return () => {
      gantt.clearAll();
    };
  }, []);

  // 當任務資料變化時，更新甘特圖的資料
  useEffect(() => {
    gantt.clearAll();
    gantt.parse(tasks);
  }, [tasks]);

  return (
    <ConfigProvider locale={zhTW}>
      <div className="filters" style={{ marginBottom: '16px' }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={8} lg={6} xl={3}>
            <label style={{ marginRight: '8px', fontWeight: 'bold' }}>標籤類別：</label>
            <Select
              value={selectedTag}
              onChange={(value) => {
                setSelectedTag(value || '(全部)');
                setSelectedCategory('(全部)')
              }}
              style={{ width: '200px' }}
              placeholder="選擇標籤類別"
              allowClear
              showSearch
              suffixIcon={<BorderlessTableOutlined />}
              filterOption={(input, option) =>
                option.children.toLowerCase().includes(input.toLowerCase()) // 過濾選項
              }
            >
              <Option key="(全部)" value="(全部)">(全部)</Option>
              {uniqueTags.map((tag) => (
                <Option key={tag} value={tag}>{tag}</Option>
              ))}
            </Select>
          </Col>
  
          <Col xs={24} sm={12} md={8} lg={6} xl={3}>
            <label style={{ marginRight: '8px', fontWeight: 'bold' }}>標籤：</label>
            <Select
              value={selectedCategory}
              onChange={(value) => setSelectState(value || '(全部)')}
              style={{ width: '200px' }}
              placeholder="選擇標籤"
              allowClear
              showSearch
              suffixIcon={<BorderlessTableOutlined />}
              filterOption={(input, option) =>
                option.children.toLowerCase().includes(input.toLowerCase()) // 過濾選項
              }
            >
              <Option key="(全部)" value="(全部)">(全部)</Option>
              {filteredCategories.map((tag) => (
                <Option key={tag[fieldCodes.標籤].value} value={tag[fieldCodes.標籤].value}>
                  {tag[fieldCodes.標籤].value}
                </Option>
              ))}
            </Select>
          </Col>
  
          <Col xs={24} sm={12} md={8} lg={6} xl={3}>
            <label style={{ marginRight: '8px', fontWeight: 'bold' }}>人員：</label>
            <Select
              value={selectedUser}
              onChange={(value) => setSelectedUser(value || '所有人員(ALL)')}
              style={{ width: '200px' }}
              placeholder="選擇人員"
              allowClear
              showSearch
              suffixIcon={<UserOutlined />}
              filterOption={(input, option) =>
                option.children.toLowerCase().includes(input.toLowerCase()) // 過濾選項
              }
            >
              <Option value={null}>所有人員(ALL)</Option>
              {登入帳號.map(user => (
                <Option key={user.code} value={user.code}>{user.name}</Option>
              ))}
            </Select>
          </Col>
  
          <Col xs={24} sm={12} md={8} lg={6} xl={3}>
            <label style={{ marginRight: '8px', fontWeight: 'bold' }}>發行日期：</label>
            <DatePicker
              value={date}
              onChange={(date) => setDate(date)}
              style={{ width: '200px' }}
              placeholder="選擇發行日期"
              suffixIcon={<CalendarOutlined />}
            />
          </Col>

          <Col xs={24} sm={12} md={8} lg={6} xl={5}>
            <label style={{ marginRight: '8px', fontWeight: 'bold' }}>狀態：</label>
            <Select
              mode="multiple"
              value={selectState}
              onChange={(value) => setSelectState(value)}
              style={{ width: '550px' }}
              placeholder="選擇狀態"
              allowClear
              showSearch
              suffixIcon={<FlagOutlined />}
              filterOption={(input, option) =>
                option.children.toLowerCase().includes(input.toLowerCase())
              }
            >
              {states.map((state) => (
                <Option key={state} value={state}>{state}</Option>
              ))}
            </Select>
          </Col>
        </Row>
      </div>
      <div ref={ganttContainer} style={{ width: '100%', height: '800px' }} />
    </ConfigProvider>
  );
};

export default GanttChart;

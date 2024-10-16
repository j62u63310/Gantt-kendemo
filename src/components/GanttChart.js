import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import 'dhtmlx-gantt/codebase/dhtmlxgantt.css';
import { gantt } from 'dhtmlx-gantt';
import { useSelector } from 'react-redux';
import { Button, Select, DatePicker, Badge, Tooltip, ConfigProvider, Modal, Row, Col, Checkbox, Radio } from 'antd';
import { fieldCodes, getStatusColor, 本地化 } from '../config/AppConfig';
import { UserOutlined, BorderlessTableOutlined, CalendarOutlined, CloseOutlined  } from '@ant-design/icons';
import { getCookie } from '../service/process';
import TimeLine from './TimeLine';
import "../styles/GanttChart.css"

import dayjs from 'dayjs';
import 'dayjs/locale/zh-tw';
import zhTW from "antd/lib/locale/zh_TW";
dayjs.locale('zh-tw');

const { Option } = Select;

const status = ['A-發行', 'B-進行中', 'C-驗收( V&V )', 'F-結案', 'P-暫緩', 'R-返工'];

const GanttChart = () => {
  const showSetting = JSON.parse(getCookie("ken_Setting")) || {
      selectedCategory: '(全部)',
      selectedTag: '(全部)',
      selectedUser: kintone.getLoginUser().code,
      selectedDate: dayjs().subtract(7, 'day'),
      selectedView: 'month',
      selectedOpen: false,
      selectedToday: false,
      selectedShowDate: fieldCodes.開始時間,
  };
  
  const ganttContainer = useRef(null);
  const 標籤資料 = useSelector((state) => state.標籤);
  const 行事曆資料 = useSelector((state) => state.行事曆);
  const 登入帳號 = useSelector((state) => state.登入帳號);

  const [selectedSetting, setSelectedSetting] = useState(showSetting);

  const [state, setState] = useState([]);
  const [isState, setIsState] = useState(status.filter(item => item !== 'F-結案' && item !== 'P-暫緩'));
  const [isModalShow, setIsModalShow] = useState(false);
  const [currentTask, setCurrentTask] = useState(null);

  useEffect(() => {
    const 登入 = kintone.getLoginUser();
    setSelectedSetting((prev) => ({ ...prev, selectedUser: 登入.code }));
  }, []);

  useEffect(() => {
    document.cookie = `ken_Setting=${JSON.stringify(selectedSetting)}; path=/k/${kintone.app.getId()}/; expires=Fri, 31 Dec 9999 23:59:59 GMT`;
  }, [selectedSetting])

  const scales = {
    year: [
      { unit: 'year', step: 1, format: '%Y年' },
      { unit: 'month', step: 1, format: '%m月' },
    ],
    month: [
      { unit: 'month', step: 1, format: '%Y年 %m月' },
      { unit: 'week', step: 1, format: '第%W週' },
    ],
    week: [
      { unit: 'week', step: 1, format: '%Y年 第%W週' },
      { unit: 'day', step: 1, format: '%m月%d日' },
    ],
    day: [
      { unit: 'week', step: 1, format: '%Y年 第%W週' },
      { unit: 'day', step: 1, format: '%m月%d日' },
    ]
  };

  const uniqueTags = useMemo(() => {
    const allTags = 標籤資料.map((record) => record[fieldCodes.標籤類別].value);
    return Array.from(new Set(allTags));
  }, [標籤資料]);

  const filteredCategories = useMemo(() => {
    const filteredData = selectedSetting.selectedCategory === '(全部)'
      ? 標籤資料
      : 標籤資料.filter(record => record[fieldCodes.標籤類別].value === selectedSetting.selectedCategory);
    return filteredData;
  }, [selectedSetting, 標籤資料]);

  const filterData = useMemo(() => {
    if (!行事曆資料) return [];
    let filteredData = 行事曆資料;

    if (selectedSetting.selectedDate) {
      filteredData = filteredData.filter(record => {
        const 發行日 = dayjs(record[fieldCodes.發行日].value);
        return 發行日.isSame(selectedSetting.selectedDate, 'day') || 發行日.isAfter(selectedSetting.selectedDate, 'day');
      });
    }

    if(selectedSetting.selectedToday){
      filteredData = filteredData.filter(record => {
        const 開始時間 = dayjs(record[fieldCodes.開始時間].value);
        return 開始時間.isSame(dayjs(new Date()), 'day') || 開始時間.isAfter(dayjs(new Date()), 'day');
      });
    }

    if (selectedSetting.selectedUser && selectedSetting.selectedUser !== '所有人員(ALL)') {
      filteredData = filteredData.filter(record =>
        record[fieldCodes.處理人員].value.some(user => user.code === selectedSetting.selectedUser)
      );
    }

    filteredData = filteredData.filter(record =>
      isState.includes(record[fieldCodes.作業狀態_完成度].value)
    );

    const eventCounts = status.reduce((acc, state) => {
      acc[state] = 0;
      return acc;
    }, {});

    for (const record of filteredData) {
      const 所有標籤 = record[fieldCodes.標籤].value.split(',');
      if (selectedSetting.selectedTag === '(全部)' && !filteredCategories.some(tag => 所有標籤.includes(tag[fieldCodes.標籤].value))) continue;
      else if (selectedSetting.selectedTag !== '(全部)' && !所有標籤.includes(selectedSetting.selectedTag)) continue;
      eventCounts[record[fieldCodes.作業狀態_完成度].value]++;
    }

    setState(Object.entries(eventCounts));

    return filteredData;
  }, [行事曆資料, selectedSetting, isState, filteredCategories]);

  const tasks = useMemo(() => {
    const recordData = [];
    const recordLinks = [];
    const 標籤ids = {};

    for (const record of 標籤資料) {
      const 標籤 = record[fieldCodes.標籤].value;
      const 標籤類別 = record[fieldCodes.標籤類別].value;
      if (selectedSetting.selectedCategory !== '(全部)' && 標籤類別 !== selectedSetting.selectedCategory) continue;
      if (selectedSetting.selectedTag !== '(全部)' && 標籤 !== selectedSetting.selectedTag) continue;
      if (!filterData.some(record => {
        const 所有標籤 = record[fieldCodes.標籤].value.split(',');
        return 所有標籤.includes(標籤);
      })) continue;

      const 最後取用時間 = dayjs(record[fieldCodes.最後取用時間].value).format('YYYY/MM/DD HH:mm');
      if (!標籤ids[標籤]) {
        標籤ids[標籤] = recordData.length + 1;
        recordData.push({
          id: 標籤ids[標籤],
          [fieldCodes.問題標題]: `${標籤}【${最後取用時間}】`,
          [fieldCodes.作業狀態_完成度]: 'tags',
          open: selectedSetting.selectedOpen,
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
            start_date: 發行日.format('YYYY-MM-DD HH:mm'),
            end_date: endDate.format('YYYY-MM-DD HH:mm'),
            [fieldCodes.問題標題]: record[fieldCodes.問題標題].value,
            [fieldCodes.優先度]: record[fieldCodes.優先度].value,
            [fieldCodes.標籤]: record[fieldCodes.標籤].value,
            [fieldCodes.說明]: record[fieldCodes.說明].value,
            [fieldCodes.驗證說明]: record[fieldCodes.驗證說明].value,
            [fieldCodes.問題編號]: record[fieldCodes.問題編號].value,
            [fieldCodes.處理人員]: 處理人員,
            [fieldCodes.作業狀態_完成度]: record[fieldCodes.作業狀態_完成度]?.value,
            [fieldCodes.開始時間]: record[fieldCodes.開始時間].value,
            [fieldCodes.更新時間]: record[fieldCodes.更新時間].value,
            [fieldCodes.提醒時間]: record[fieldCodes.提醒時間].value,
            [fieldCodes.發行日]: 發行日.format('YYYY-MM-DD HH:mm'),
            [fieldCodes.到期日]: endDate.format('YYYY-MM-DD HH:mm'),
            $id: record["$id"].value,
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
  }, [標籤資料, filterData, selectedSetting]);

  const handleStateFilter = useCallback((status) => {
    let array = [...isState];
    if (array.includes(status)) {
      array = array.filter(item => item !== status);
    } else {
      array.push(status);
    }
    setIsState(array);
  }, [isState]);

  const handleViewChange = useCallback((view) => {
    setSelectedSetting((prev) => ({ ...prev, selectedView: view }));

    // 更新甘特圖配置
    gantt.config.scale_unit = scales[view][0].unit;
    gantt.config.date_scale = scales[view][0].format;
    gantt.config.subscales = scales[view].slice(1).map((scale) => ({
      unit: scale.unit,
      step: scale.step,
      date: scale.format,
    }));

    // 重新解析任務資料
    gantt.clearAll();
    gantt.parse(tasks);
  }, [tasks]);

  useEffect(() => {

    tasks.data.forEach(task => {
      if (task[fieldCodes.開始時間]) {
        const taskStartDate = new Date(task.start_date);
        const taskEndDate = new Date(task.end_date);
        const startTime = new Date(task[fieldCodes.開始時間]);
    
        if (startTime >= taskStartDate && startTime <= taskEndDate) {
          const totalDuration = taskEndDate - taskStartDate;
    
          const durationUntilStartTime = startTime - taskStartDate;
    
          let progress = durationUntilStartTime / totalDuration;
    
          if (progress < 0) progress = 0;
          if (progress > 1) progress = 1;
    
          task.progress = progress;
        } else if (startTime > taskEndDate) {
          task.progress = 1;
        } else {
          task.progress = 0;
        }
      } else {
        task.progress = 0;
      }
    });

    gantt.config.xml_date = '%Y-%m-%d %H:%i';
    gantt.config.date_format = '%Y-%m-%d %H:%i';
    gantt.config.date_grid = '%Y年%m月%d日 %H:%i';

    // 設定時間軸單位和格式
    gantt.config.scale_unit = scales[selectedSetting.selectedView][0].unit;
    gantt.config.date_scale = scales[selectedSetting.selectedView][0].format;
    gantt.config.subscales = scales[selectedSetting.selectedView].slice(1).map((scale) => ({
      unit: scale.unit,
      step: scale.step,
      date: scale.format,
    }));

    // 調整時間刻度的步長和格式
    if (selectedSetting.selectedView === 'week') {
      gantt.config.subscales[0].step = 1;
    } else if (selectedSetting.selectedView === 'month') {
      gantt.config.subscales[0].step = 1;
    } else if (selectedSetting.selectedView === 'year') {
      gantt.config.subscales[0].step = 1;
    }

    // 自定義任務編輯器中的日期範圍顯示
    gantt.templates.lightbox_header = function (start, end, task) {
      var formatFunc = gantt.date.date_to_str("%Y年%m月%d日 %H:%i");
      return task[fieldCodes.問題標題] + ", " + formatFunc(start) + " - " + formatFunc(end);
    };

    gantt.config.autosize = 'xy';
    gantt.config.smart_rendering = false;

    // 唯讀
    gantt.config.readonly = true;

    // 展開全部
    gantt.config.open_tree_initially = false;

    // 設定繁體中文配置
    gantt.locale = 本地化;

    // 根據訂單種類分類顏色及圖標
    gantt.templates.task_class = function (start, end, task) {
      // 根據作業狀態分類樣式
      switch (task[fieldCodes.作業狀態_完成度]) {
        case 'tags':
          return ' hidden-task';
        case 'A-發行':
          return ' A-發行';
        case 'B-進行中':
          return ' B-進行中';
        case 'C-驗收( V&V )':
          return ' C-驗收';
        case 'F-結案':
          return ' F-結案';
        case 'P-暫緩':
          return ' P-暫緩';
        case 'R-返工':
          return ' R-返工';
        default:
          return '';
      }
    };
  

    gantt.templates.task_text = function(start, end, task) {
      return task[fieldCodes.問題標題]; 
    };

    // 設置 tooltip 顯示
    gantt.templates.tooltip_text = function (start, end, task) {
      if (task[fieldCodes.作業狀態_完成度] === 'tags') return;
      return `<b>問題編號: </b> #${task[fieldCodes.問題編號] || ''}<br/>
              <b>問題標題: </b> ${task[fieldCodes.問題標題] || ''}<br/>
              <b>處理人員: </b> ${task[fieldCodes.處理人員] || ''}<br/>
              <b>作業狀態: </b> ${task[fieldCodes.作業狀態_完成度] || ''}<br/>
              <b>發行時間: </b> ${dayjs(start).format('YYYY/MM/DD HH:mm') || ''}<br/>
              <b>到期時間: </b> ${dayjs(end).format('YYYY/MM/DD HH:mm') || ''}<br/>`;
    };

    gantt.config.tooltip_timeout = 0;

    gantt.plugins({ tooltip: true });

    gantt.config.grid_width = 600;

    // 調整問題標題的列寬度和顯示方式
    gantt.config.columns = [
      {
        name: '問題標題',
        label: '問題標題',
        width: '*',
        tree: true,
        template: function (task) {
          let colorClass = '';
    
          switch (task[fieldCodes.作業狀態_完成度]) {
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
    
          const childCount = gantt.getChildren(task.id).length;
    
          const childText = childCount > 0 ? `#${childCount}` : '';
    
          return `<div class='status-color ${colorClass}'></div>${task[fieldCodes.問題標題]}${childText}`;
        },
      },
    ];

    // 隱藏文件圖標，保留資料夾圖標
    gantt.templates.grid_file = function (task) {
      return "";
    };

    gantt.templates.scale_cell_class = function (date) {
      return "gantt_scale_cell";
    };
    
    // 標記任務區域上早於今天的日期為灰色
    gantt.templates.timeline_cell_class = function (task, date) {
      const today = dayjs().startOf('day').toDate(); // 今天的開始時間
      const todayPos = gantt.posFromDate(today); // 今天的起始位置
      const datePos = gantt.posFromDate(date);
    
      const nextDatePos = gantt.posFromDate(gantt.date.add(date, 1, gantt.getState().scale_unit));
      if (nextDatePos <= todayPos) {
        // 完全過去的時間單位，填滿灰色
        return "gantt_timeline_past";
      } else if (datePos < todayPos && todayPos < nextDatePos) {

        const fillPercentage = ((todayPos - datePos) / (nextDatePos - datePos)) * 100;
        
        // 動態創建 class 並設置漸變背景色
        const dynamicStyle = document.createElement('style');
        dynamicStyle.innerHTML = `
          .gantt_timeline_partially_filled_${datePos} {
            background: linear-gradient(to right, #fff8dc ${fillPercentage}%, transparent ${fillPercentage}%);
          }
        `;
        document.head.appendChild(dynamicStyle);
        return `gantt_timeline_partially_filled_${datePos}`; // 使用動態創建的 class
      }
    
      return "gantt_timeline_cell";
    };

    // 初始化甘特圖
    gantt.init(ganttContainer.current);

    // 解析任務資料
    gantt.clearAll();
    gantt.parse(tasks);

    gantt.detachAllEvents();

    // 創建今天標記線的元素
    const todayLine = document.createElement('div');
    todayLine.className = 'today-line';
  
    const taskArea = gantt.$task_data;
    if (taskArea) {
      taskArea.appendChild(todayLine);
    }
  
    const updateTodayLinePosition = () => {
      const today = dayjs().startOf('day').toDate();
      const todayPos = gantt.posFromDate(today);

      const scrollState = gantt.getScrollState();
      const scrollTop = scrollState.y;
  
      if (todayPos === null || isNaN(todayPos)) {
        todayLine.style.display = 'none';
      } else {
        todayLine.style.display = 'block';
        todayLine.style.marginTop = `${-scrollTop}px`;
        todayLine.style.left = `${todayPos}px`;
      }
    };
  
    // 初始化時更新今天標記線的位置
    updateTodayLinePosition();

    // 設置點擊事件
    gantt.attachEvent("onTaskClick", function (id, e) {
      const tooltipElement = document.querySelector('.gantt_tooltip');
      if (tooltipElement) {
        tooltipElement.remove();
      }
      const task = gantt.getTask(id);
      if(task[fieldCodes.作業狀態_完成度] == 'tags') return true;
      setCurrentTask(task);
      setIsModalShow(true);
      return true;
    });

    const events = [];
    events.push(gantt.attachEvent('onGanttRender', updateTodayLinePosition));
    events.push(gantt.attachEvent('onDataRender', updateTodayLinePosition));
    events.push(gantt.attachEvent('onViewChange', updateTodayLinePosition));
    events.push(gantt.attachEvent('onAfterTaskAdd', updateTodayLinePosition));
    events.push(gantt.attachEvent('onAfterTaskUpdate', updateTodayLinePosition));
    events.push(gantt.attachEvent('onParse', updateTodayLinePosition));

    
    taskArea.addEventListener('scroll', updateTodayLinePosition);

    // 清理函數，當組件卸載時清除甘特圖
    return () => {
      gantt.clearAll();
      gantt.detachAllEvents();
      events.forEach((id) => gantt.detachEvent(id));
      if (todayLine && todayLine.parentNode) {
        todayLine.parentNode.removeChild(todayLine);
      }
    };
  }, [selectedSetting, tasks]);

  useEffect(() => {
    gantt.clearAll();
    gantt.parse(tasks);
  }, [tasks, selectedSetting]);

  return (
    <ConfigProvider locale={zhTW}>
      <div className="filters" style={{ marginBottom: '16px', marginLeft: '10px' }}>
        <Row gutter={[24, 24]} align="middle">
          <Col xs={24} sm={12} md={8} lg={6} xl={3}>
            <label style={{ marginBottom: '8px', fontWeight: 'bold' }}>標籤類別：</label>
            <Select
              value={selectedSetting.selectedCategory}
              onChange={(value) => {
                setSelectedSetting((prev) => ({ ...prev, selectedCategory: value || '(全部)', selectedTag: '(全部)' }));
              }}
              style={{ width: '200px' }}
              placeholder="選擇標籤類別"
              allowClear
              showSearch
              suffixIcon={<BorderlessTableOutlined />}
              filterOption={(input, option) =>
                option.children.toLowerCase().includes(input.toLowerCase())
              }
            >
              <Option key="(全部)" value="(全部)">
                (全部)
              </Option>
              {uniqueTags.map((tag) => (
                <Option key={tag} value={tag}>
                  {tag}
                </Option>
              ))}
            </Select>
          </Col>

          <Col xs={24} sm={12} md={8} lg={6} xl={3}>
            <label style={{ marginBottom: '8px', fontWeight: 'bold' }}>標籤：</label>
            <Select
              value={selectedSetting.selectedTag}
              onChange={(value) => {
                setSelectedSetting((prev) => ({ ...prev, selectedTag: value || '(全部)' }));
              }}
              style={{ width: '200px' }}
              placeholder="選擇標籤"
              allowClear
              showSearch
              suffixIcon={<BorderlessTableOutlined />}
              filterOption={(input, option) =>
                option.children.toLowerCase().includes(input.toLowerCase())
              }
            >
              <Option key="(全部)" value="(全部)">
                (全部)
              </Option>
              {filteredCategories.map((tag) => (
                <Option
                  key={tag[fieldCodes.標籤].value}
                  value={tag[fieldCodes.標籤].value}
                >
                  {tag[fieldCodes.標籤].value}
                </Option>
              ))}
            </Select>
          </Col>

          <Col xs={24} sm={12} md={8} lg={6} xl={3}>
            <label style={{ marginBottom: '8px', fontWeight: 'bold' }}>人員：</label>
            <Select
              value={selectedSetting.selectedUser}
              onChange={(value) => {
                setSelectedSetting((prev) => ({ ...prev, selectedUser: value || '所有人員(ALL)' }));
              }}
              style={{ width: '200px' }}
              placeholder="選擇人員"
              allowClear
              showSearch
              suffixIcon={<UserOutlined />}
              filterOption={(input, option) =>
                option.children.toLowerCase().includes(input.toLowerCase())
              }
            >
              <Option value={null}>所有人員(ALL)</Option>
              {登入帳號.map((user) => (
                <Option key={user.code} value={user.code}>
                  {user.name}
                </Option>
              ))}
            </Select>
          </Col>

          <Col xs={24} sm={12} md={8} lg={6} xl={3}>
            <label style={{ marginBottom: '8px', fontWeight: 'bold' }}>發行日期：</label>
            <DatePicker
              value={dayjs(selectedSetting.selectedDate).isValid() ? dayjs(selectedSetting.selectedDate) : dayjs().subtract(7, 'day')}
              onChange={(value) => {
                setSelectedSetting((prev) => ({ ...prev, selectedDate: value }));
              }}
              style={{ width: '200px' }}
              placeholder="選擇發行日期"
              suffixIcon={<CalendarOutlined />}
              disabledDate={(current) => {
                return current && current > dayjs().endOf('day');
              }}
            />
          </Col>

          <Col xs={24} sm={12} md={8} lg={6} xl={4}>
            <label style={{ marginBottom: '12px', fontWeight: 'bold' }}>狀態：</label>
            <div className="gantt-status-badges">
              {state.map(([status, count]) => (
                <Tooltip
                  key={status}
                  title={<div>{status}</div>}
                >
                  <Badge
                    className={`gantt-state-${isState.includes(status)}`}
                    count={isState.includes(status) ? count : 'X'}
                    showZero
                    style={{ backgroundColor: getStatusColor(status) }}
                    onClick={() => handleStateFilter(status)}
                  />
                </Tooltip>
              ))}
            </div>
          </Col>

          <Col xs={24} sm={12} md={8} lg={6} xl={3}>
            <label style={{ marginBottom: '8px', fontWeight: 'bold' }}>時間線：</label>
            <Radio.Group
              className="view-toggle"
              value={selectedSetting.selectedView == 'day' ? 'week' : selectedSetting.selectedView}
              onChange={(e) => {
                handleViewChange(e.target.value)
              }}
            >
              <Radio.Button value="year">年</Radio.Button>
              <Radio.Button value="month">月</Radio.Button>
              <Radio.Button value="week">週</Radio.Button>
            </Radio.Group>
          </Col>

          <Col xs={24} sm={12} md={8} lg={6} xl={1}>
            <div className="show-all">
              <Button type="primary" onClick={() =>  setSelectedSetting((prev) => ({ ...prev, selectedOpen: !prev.selectedOpen }))} className={`show-all-${selectedSetting.selectedOpen}`}>全展開</Button>
            </div>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6} xl={1}>
            <Button
              type="primary"
              className={`gantt-today-${selectedSetting.selectedToday}`}
              onClick={() => {
                setSelectedSetting((prev) => ({
                  ...prev,
                  selectedCategory: selectedSetting.selectedToday ? '(全部)' :'公司',
                  selectedToday: !selectedSetting.selectedToday
                }));
              }}
            >
              今日事
            </Button>
          </Col>
        </Row>
      </div>
      <div ref={ganttContainer} style={{ width: '99%', marginLeft: '10px', overflow: 'hidden', }} />
      <Modal
        open={isModalShow}
        onCancel={() => setIsModalShow(false)}
        footer={null}
        closeIcon={null}
        className="timeline-tag-modal"
      >
         {currentTask ? (
          <div>
            <div className="modal-fixed-header">
              <div className="modal-title">
                <span>{`#${currentTask[fieldCodes.標籤]} 資料`}</span>
                <CloseOutlined className="close-icon" onClick={() => setIsModalShow(false)} />
              </div>
            </div>
            <TimeLine
              record={currentTask}
              setIsModalShow={setIsModalShow}
              setSelectedTag={(tag) => setSelectedSetting((prev) => ({ ...prev, selectedTag: tag }))}
              setSelectedCategory={(category) => setSelectedSetting((prev) => ({ ...prev, selectedCategory: category }))}
            />
          </div>
        ) : (
          <p>未選擇任務或任務資料不可用。</p>
        )}
      </Modal>
    </ConfigProvider>
  );
};

export default GanttChart;
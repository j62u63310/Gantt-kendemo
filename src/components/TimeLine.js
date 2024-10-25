import React, { useCallback, useState, useEffect,  useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { Typography, Button, Tag, message } from 'antd';
import { CalendarOutlined, FlagOutlined, UserOutlined } from '@ant-design/icons';
import { format, addDays } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import Swal from 'sweetalert2';

import DOMPurify from 'dompurify';

import { colors, fieldCodes, dateOrder } from '../config/AppConfig';

import "../styles/Timeline.css";
import "../styles/Swal.css"

const { Text } = Typography;

const Timeline = ({ record, setIsModalShow, setSelectedTag, setSelectedCategory }) => {

  const [timeline, setTimeline] = useState(record);

  const dispatch = useDispatch();

  useEffect(() => {
    setTimeline(record);
  }, [record]);

  //狀態按鈕
  const buttonConfigs = useMemo(() => [
    { currentStatus: "A-發行", nextStatus: "B-進行中" },
    { currentStatus: ["B-進行中", "R-返工"], nextStatus: "C-驗收( V&V )" },
    { currentStatus: "C-驗收( V&V )", nextStatus: "F-結案" },
    { currentStatus: ["B-進行", "C-驗收( V&V )", "R-返工"], nextStatus: "P-暫緩" },
    { currentStatus: ["F-結案", "C-驗收( V&V )", "P-暫緩"], nextStatus: "R-返工" },
  ], []);

  //按鈕顯示顏色
  const buttonStyle = useCallback((status) => ({
    backgroundColor: colors[status],
    borderColor: colors[status],
    color: 'white',
  }), []);

/* ---------------------------------------------------------------*/
/*                     資料處理與監聽                              */
/* -------------------------------------------------------------- */

  //格式化日期
  const formatDateTime = useCallback((date) => {
    if (date) {
      const d = typeof date === 'string' ? new Date(date) : date;
  
      if (isNaN(d.getTime())) {
        return "無效的日期";
      }
  
      const hasTime = date.toString().includes('T');
  
      // 根據是否有時間部分進行格式化
      if (!hasTime) return format(d, 'yyyy/MM/dd', { locale: zhTW });
      return format(d, 'yyyy/MM/dd HH:mm', { locale: zhTW });
    } else {
      return "無設定";
    }
  }, []);

  //更新開始時間
  const setStartTime = useCallback(async (currentTime, id, showDate) => {
    const showMessage = showDate == fieldCodes.提醒時間 ? '作業規劃/提醒時間' : '開始時間' ;
    try {
      const now = new Date();
      now.setHours(now.getHours() + 8);
      const formattedTime = new Date(currentTime.getTime() + 8 * 60 * 60 * 1000).toISOString().replace('Z', '+08:00');
      const updateData = { [showDate]: { value: formattedTime }, 更新時間: { value: now.toISOString().replace('Z', '+08:00') } };
      
      dispatch({ type: 'UPDATE_行事曆_ITEM', payload: { id, data: updateData } });

      await kintone.api(kintone.api.url('/k/v1/record', true), 'PUT', { 
        app: kintone.app.getId(), 
        id: id, 
        record: {
          [showDate]: { value: formattedTime }
        }
      });

      message.success(`${showMessage}已記錄：${formatDateTime(currentTime)}`);
    } catch (error) {
      console.error(`更新${showMessage}失敗`, error);
      message.error(`更新${showMessage}失敗`);
    }finally{
      setIsModalShow(false);
    }
  }, [dispatch, formatDateTime]);

/* ---------------------------------------------------------------*/
/*                     按鈕或點擊事件處理                           */
/* -------------------------------------------------------------- */

  //編輯或查看記錄
  const handleEdit = useCallback((id, edit) => {
    window.open(`https://${window.location.hostname}/k/${kintone.app.getId()}/show#record=${id}${edit ? "&mode=edit" : ""}`, '_blank');
  }, []);

  //按下開始作業
  const handleStartWork = useCallback(async (id) => {
    const now = new Date();
    const tomorrow = addDays(now, 1);
    const dayAfterTomorrow = addDays(now, 2);
    let selectedDate;
  
    const formatDateWithWeekday = (date) => {
      return format(date, 'yyyy/MM/dd (EEEE)', { locale: zhTW });
    };
  
    const { isConfirmed, value } = await Swal.fire({
      title: '請選擇開始作業的時間',
      icon: 'info',
      html: `
        <div class="radio-group-container">
          <div class="custom-radio-group">
            <label><input type="radio" name="dateChoice" value="today"> 今天 ${formatDateWithWeekday(now)}</label>
            <label><input type="radio" name="dateChoice" value="tomorrow"> 明天 ${formatDateWithWeekday(tomorrow)}</label>
            <label><input type="radio" name="dateChoice" value="custom" checked> 其他
                <input type="date" id="customDate" value="${format(dayAfterTomorrow, 'yyyy-MM-dd')}" min="${format(now, 'yyyy-MM-dd')}">
            </label>
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: '確定',
      cancelButtonText: '取消',
      customClass: {
        popup: 'custom-popup',
        title: 'custom-title',
        actions: 'custom-actions',
        confirmButton: 'custom-confirm-button',
        cancelButton: 'custom-cancel-button'
      },
      preConfirm: () => {
        const choice = document.querySelector('input[name="dateChoice"]:checked').value;
        const customDateInput = document.getElementById('customDate');
        switch (choice) {
          case 'today':
            selectedDate =  now;
            break;
          case 'tomorrow':
            selectedDate = tomorrow;
            break;
          case 'custom':
            selectedDate =  new Date(customDateInput.value);
            break;
        }
      }
    });
  
    if (isConfirmed && value) {
      selectedDate.setHours(0, 0, 0, 0);
      await setStartTime(selectedDate, id, fieldCodes.提醒時間);
  
      // 顯示確認訊息
      await Swal.fire({
        title: '已設置開始時間',
        text: `開始時間已設置為 ${formatDateWithWeekday(selectedDate)}`,
        icon: 'success',
        confirmButtonText: '確定',
        customClass: {
          popup: 'custom-popup',
          title: 'custom-title',
          content: 'custom-content',
          confirmButton: 'custom-confirm-button'
        }
      });
    }
  }, [setStartTime]);

  const handleStartWorkNow = useCallback(async (id)=>{
    setStartTime(new Date(), id, fieldCodes.開始時間);

    const formatDateWithWeekday = (date) => {
      return format(date, 'yyyy/MM/dd (EEEE)', { locale: zhTW });
    };
    Swal.fire({
      title: '已設置開始時間',
      text: `開始時間已設置為 ${formatDateWithWeekday(new Date())}`,
      icon: 'success',
      confirmButtonText: '確定',
      customClass: {
        popup: 'custom-popup',
        title: 'custom-title',
        content: 'custom-content',
        confirmButton: 'custom-confirm-button'
      }
    });
  }, [setStartTime])

  //按下變更狀態
  const handleChangeState = useCallback(async (id, state) => {
    const { isConfirmed } = await Swal.fire({
      title: `是否要更改狀態為 ${state} ？`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: '是的',
      cancelButtonText: '取消'
    });

    if (isConfirmed) {
      try {
        const updateData = { [fieldCodes.作業狀態_完成度]: { value: state } };
        dispatch({ type: 'UPDATE_行事曆_ITEM', payload: { id, data: updateData } });

        await kintone.api(kintone.api.url('/k/v1/record', true), 'PUT', { 
          app: kintone.app.getId(), 
          id: id, 
          record: updateData
        });

        message.success(`狀態已更新為：${state}`);
      } catch (error) {
        console.error('Kintone 更新失敗:', error);
        message.error('更新狀態失敗');
      }finally{
        setIsModalShow(false);
      }
    }
  }, []);

  //按下標籤
  const handleTagClick = useCallback((tag) => {
    setSelectedTag(tag);
    setSelectedCategory('(全部)');
    setIsModalShow(false);
  }, []);

  const shortTitle = (title) => {
    let length = 0;
    let shortenedTitle = '';
    
    for (let i = 0; i < title.length; i++) {
      // 判斷是否是中文字符
      if (title.charCodeAt(i) > 0x4E00 && title.charCodeAt(i) < 0x9FFF) {
        length += 2; // 中文算 2
      } else {
        length += 1; // 英文算 1
      }
  
      // 如果累計長度超過 50，結束迴圈並添加 "..."
      if (length > 50) {
        shortenedTitle += "...";
        break;
      }
  
      shortenedTitle += title[i];
    }
  
    return shortenedTitle;
  };


/* ---------------------------------------------------------------*/
/*                          顯示的畫面                             */
/* -------------------------------------------------------------- */

  //彙整資料
  const renderEvent = useCallback((record) => {
    const 問題標題 = shortTitle(record[fieldCodes.問題標題]) || '無';
    const 處理人員 = record[fieldCodes.處理人員].split(',').map(person => person.trim());
    const 狀態 = record[fieldCodes.作業狀態_完成度] || '無';
    const 日期 = record[fieldCodes.發行日];
    const statusColor = colors[狀態];
    const 標籤 = record[fieldCodes.標籤].split(',').map(tag => tag.trim());

    const 說明 = record[fieldCodes.說明];

    if (!日期) return null;

    const convertUrlsToLinks = (text) => {
      const urlRegex = /(https?:\/\/[^\s<>\u4e00-\u9fff]+)/g;
      return text.replace(urlRegex, (url) => {
        return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
      });
    };

    const renderText = () => {
  
      const sanitizedText = DOMPurify.sanitize(說明);
      const textWithLinks = convertUrlsToLinks(sanitizedText);
    
      const strippedText = textWithLinks
        .replace(/<br\s*\/?>/g, '')
        .replace(/<div\b[^>]*>(.*?)<\/div>/gi, '$1')
        .trim();  
    
      if (!strippedText || strippedText == '<div></div>') {
        return <div className="collapsible-text-section">無內容</div>;
      }
    
      return (
        <div className="collapsible-text-section">
          <div dangerouslySetInnerHTML={{ __html: textWithLinks }} />
        </div>
      );
    };

    return (
      <div key={record.$id} className="timeline-item" style={{ '--status-color': statusColor }}>
        <div className="timeline-status-bar"></div>
        <div className="timeline-content">
          <div className="timeline-header">
            <div className="timeline-title-section">
              <div className="timeline-status">
                <FlagOutlined /> {狀態}
              </div>
              <Text className="timeline-title">{問題標題}</Text>
            </div>
            <div className="timeline-info">
              <Tag className={`timeline-tag timeline-priority ${record[fieldCodes.優先度]}`}>{record[fieldCodes.優先度]}</Tag>
              <Tag className="timeline-tag timeline-date">
                <CalendarOutlined /> {fieldCodes.發行日} {formatDateTime(日期)}
              </Tag>
              <Tag className="timeline-tag timeline-number">#{record[fieldCodes.問題編號]}</Tag>
            </div>
          </div>
          <div className='timeline-detail'>
            <div className="collapsible-text-section">
              {renderText()}
            </div>
            <div className="timeline-users">
              {處理人員.length > 0 ? 處理人員.map((person, index) => (
                <Tag key={index} className="timeline-tag timeline-user">
                  <UserOutlined /> {person}
                </Tag>
              )) : (
                <Tag className="timeline-tag timeline-user">
                  <UserOutlined /> 無人員
                </Tag>
              )}
            </div>
            <div className="timeline-allTag">
              {標籤.map((tag, index) => (
                <Tag 
                  key={index} 
                  className="timeline-tag timeline-otherTag" 
                  style={{ cursor: 'pointer', color: '#3498db' }} 
                  onClick={() => handleTagClick(tag)}
                >
                  #{tag}
                </Tag>
              ))}
            </div>
            <div className="timeline-allDate">
              {dateOrder.filter(recordDate => fieldCodes.發行日 !== recordDate).map((recordDate, index) => (
                <Tag key={index} className="timeline-tag timeline-otherDate">
                  <CalendarOutlined /> {recordDate} {formatDateTime(record[recordDate])}
                </Tag>
              ))}
            </div>
          </div>
          <div className='timeline-footer'>
            <div className="timeline-actions">
              <div className='timeline-actions-state'>
                {buttonConfigs.map((config, btnIndex) => {
                  const shouldRender = Array.isArray(config.currentStatus)
                    ? config.currentStatus.includes(狀態)
                    : 狀態 === config.currentStatus;

                  return shouldRender && (
                    <Button
                      type="primary"
                      key={btnIndex}
                      className={`state-button state-button-${config.nextStatus}`}
                      onClick={() => handleChangeState(record.$id, config.nextStatus)}
                      style={buttonStyle(config.nextStatus)}
                    >
                      {config.nextStatus}
                    </Button>
                  );
                })}
              </div>
              <div className="center-container">
                <Button type="primary" className="now-start-button" style={{backgroundColor: "#EF6B6B", width: "200px", }} onClick={() => handleStartWorkNow(record.$id)}>開始作業</Button>
              </div>
              <Button type="primary" className="view-button" style={{backgroundColor: "#52c41a"}} onClick={() => handleEdit(record.$id, false)}>查看資料</Button>
              <Button type="primary" className="edit-button" style={{backgroundColor: "#1890ff"}} onClick={() => handleEdit(record.$id, true)}>編輯資料</Button>
              <Button type="primary" className="start-button"  style={{backgroundColor: "#faad14"}} onClick={() => handleStartWork(record.$id)}>作業規劃/提醒時間</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }, [formatDateTime, handleTagClick, handleChangeState, handleEdit, handleStartWork, buttonConfigs, buttonStyle]);

  return <>{renderEvent(timeline)}</>;
};

export default React.memo(Timeline);
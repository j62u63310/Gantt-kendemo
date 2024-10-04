export const 本地化 = {
    date: {
        month_full: [
          '一月', '二月', '三月', '四月', '五月', '六月',
          '七月', '八月', '九月', '十月', '十一月', '十二月'
        ],
        month_short: [
          '1月', '2月', '3月', '4月', '5月', '6月',
          '7月', '8月', '9月', '10月', '11月', '12月'
        ],
        day_full: [
          '星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'
        ],
        day_short: [
          '週日', '週一', '週二', '週三', '週四', '週五', '週六'
        ],
        date_format: "%Y年%m月%d日",
        date_format_full: "%Y年%m月%d日 %H:%i"
      },
      labels: {
        // 完整的標籤配置
        new_task: '新任務',
        icon_save: '保存',
        icon_cancel: '取消',
        icon_details: '詳情',
        icon_edit: '編輯',
        icon_delete: '刪除',
        confirm_closing: '', // 取消修改?
        confirm_deleting: '是否刪除任務？',
        section_description: '描述',
        section_time: '時間範圍',
        section_type: '類型',

        /* grid columns */
        column_text: '任務名',
        column_start_date: '開始時間',
        column_duration: '持續時間',
        column_add: '',

        /* link confirmation */
        link: '連結',
        confirm_link_deleting: '將被刪除',
        link_start: '（開始）',
        link_end: '（結束）',

        type_task: '任務',
        type_project: '項目',
        type_milestone: '里程碑',

        minutes: '分鐘',
        hours: '小時',
        days: '天',
        weeks: '週',
        months: '月',
        years: '年',

        /* message popup */
        message_ok: '確定',
        message_cancel: '取消',
    },
}

export const fieldCodes = {
    問題標題: '問題標題',
    開始時間: '開始時間',
    提醒時間: '提醒時間',
    發行日: '發行日',
    到期日: '到期日',
    說明: '說明',
    處理人員: '處理人員',
    驗證說明: '驗證說明',
    作業狀態_完成度: '作業狀態_完成度',
    標籤: '標籤',

    標籤類別: '標籤類別',
    最後取用時間: '最後取用時間',
}

export const appId = {
    標籤AppId: 1094,
};

export const colors = {
  'A-發行': '#91BBF7',
  'B-進行中': '#72d766',
  'C-驗收( V&V )': '#20C997',
  'F-結案': '#a6adb3',
  'P-暫緩': '#EF6B6B',
  'R-返工': '#FFA500',
};

export const getStatusColor = (status) => {
    switch(status){
        case "A-發行":
          return '#91BBF7';
        case "B-進行中":
          return '#72d766';
        case "C-驗收( V&V )":
          return '#20C997';
        case "F-結案":
          return '#a6adb3';
        case "P-暫緩":
          return '#EF6B6B';
        case "R-返工":
          return '#FFA500';
        default:
          return '#000000';
    }
};
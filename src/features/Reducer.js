const initialState = {
    行事曆: [],
    標籤: [],
    登入帳號: [],
};

const Reducer = (state = initialState, action) => {
  switch (action.type) {
    case 'SET_行事曆_DATA':
      return {
        ...state,
        行事曆: action.payload,
      };
    case 'SET_登入帳號_DATA':
      return {
        ...state,
        登入帳號: action.payload,
      };
    case 'SET_標籤_DATA':
      return {
        ...state,
        標籤: action.payload,
      }
    default:
      return state;
  }
};

export default Reducer;
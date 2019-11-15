// ACTION TYPES

const SET_STATUS = "SET_STATUS";
const CLEAR_STATUS = "CLEAR_STATUS";

// ACTION CREATORS

export const setStatus = status => ({
  type: SET_STATUS,
  user
});

export const clearStatus = () => ({
  type: CLEAR_STATUS
});

// THUNK CREATORS

// INITIAL STATE
const initialState = "";
// REDUCER

export const userStatusReducer = (state = initialState, action) => {
  switch (action.type) {
    case SET_STATUS:
      return action.user;
    case CLEAR_STATUS:
      return initialState;
    default:
      return state;
  }
};

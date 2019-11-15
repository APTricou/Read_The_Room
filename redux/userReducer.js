// ACTION TYPES

const SET_USER = "SET_USER";
const CLEAR_USER = "CLEAR_USER";

// ACTION CREATORS

export const setUser = user => ({
  type: SET_USER,
  user
});

export const clearUser = () => ({
  type: CLEAR_USER
});

// THUNK CREATORS

// INITIAL STATE
const initialState = {};
// REDUCER

export const userReducer = (state = initialState, action) => {
  switch (action.type) {
    case SET_USER:
      return action.user;
    case CLEAR_USER:
      return {};
    default:
      return state;
  }
};

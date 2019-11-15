// ACTION TYPES

const SET_ROOM = "SET_ROOM";
const CLEAR_ROOM = "CLEAR_ROOM";

// ACTION CREATORS

export const setRoom = user => ({
  type: SET_ROOM,
  user
});

export const clearRoom = () => ({
  type: CLEAR_ROOM
});

// THUNK CREATORS

// INITIAL STATE
const initialState = "";
// REDUCER

export const roomReducer = (state = initialState, action) => {
  switch (action.type) {
    case SET_ROOM:
      return action.user;
    case CLEAR_ROOM:
      return initialState;
    default:
      return state;
  }
};

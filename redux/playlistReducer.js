// ACTION TYPES

const SET_PLAYLIST = "SET_PLAYLIST";
const CLEAR_PLAYLIST = "CLEAR_PLAYLIST";

// ACTION CREATORS

export const setPlaylist = user => ({
  type: SET_PLAYLIST,
  user
});

export const clearPlaylist = () => ({
  type: CLEAR_PLAYLIST
});

// THUNK CREATORS

// INITIAL STATE
const initialState = {};
// REDUCER

export const playlistReducer = (state = initialState, action) => {
  switch (action.type) {
    case SET_PLAYLIST:
      return action.user;
    case CLEAR_PLAYLIST:
      return {};
    default:
      return state;
  }
};

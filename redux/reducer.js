import { combineReducers } from "redux";
import { userReducer } from "./userReducer";
import { playlistReducer } from "./playlistReducer";
import { roomReducer } from "./roomReducer";
import { userStatusReducer } from "./userStatusReducer";

const reducer = combineReducers({
  playlist: playlistReducer,
  user: userReducer,
  room: roomReducer,
  userStatus: userStatusReducer
});

export default reducer;

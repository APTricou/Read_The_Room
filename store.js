import { createStore, applyMiddleware } from "redux";
import reducer from "./redux/reducer";

const store = createStore(reducer);

export default store;

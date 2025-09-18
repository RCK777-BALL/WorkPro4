"use strict";
exports.__esModule = true;
var react_1 = require("react");
var client_1 = require("react-dom/client");
var App_js_1 = require("./App.js");
var App = App_js_1.default || App_js_1;
require("./index.css");
(0, client_1.createRoot)(document.getElementById('root')).render(<react_1.StrictMode>
    <App />
  </react_1.StrictMode>);

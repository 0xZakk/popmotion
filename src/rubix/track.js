/*
    Track user input
*/
"use strict";

var calc = require('../utils/calc.js'),

    CURRENT = 'current',
    INPUT_OFFSET = 'inputOffset';

module.exports = {

    // [boolean]: Create an Action method for this rubix?
    createMethod: true,
    
    /*
        Update Input
        
        @param [Action]
        @param [object]: Action properties
    */
    updateInput: function (action, props) {
        action[INPUT_OFFSET] = calc.offset(props.inputOrigin, props.input[CURRENT]);
        
        if (action.center && action[INPUT_OFFSET].x && action[INPUT_OFFSET].y) {
            props[INPUT_OFFSET].angleFromCenter = calc.angle(action.center, props.inputOrigin);
            props[INPUT_OFFSET].distanceFromCenter = calc.distance2D(action.center, props.inputOrigin);
            action.centerOffset = calc.offset(props[INPUT_OFFSET], props.input[CURRENT]);
        }
    },
        
    /*
        Move Value relative to Input movement
        
        @param [string]: Key of current value
        @param [Value]: Current value
        @param [object]: Collection of all Action values
        @param [object]: Action properties
        @param [Action]: Current Action
        @return [number]: Calculated value
    */
    process: function (key, value, values, props, action) {
        return (action[INPUT_OFFSET].hasOwnProperty(key)) ? value.origin + action[INPUT_OFFSET][key] : value[CURRENT];
    },
    
    /*
        Has this Action ended? 
        
        @return [boolean]: False to make user manually finish .track()
    */
    hasEnded: function () {
        return false;
    }
};
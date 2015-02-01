/*jslint node:true, browser:true */

'use strict';

var Output = require('./output').Output;
var Input = require('./input').Input;

var util = require('util');
var EventEmitter = require('events').EventEmitter;

/**
 * Driver wrapper
 *
 * Use node event emitting API and emit event objects
 * rather than raw data
 *
 * @param {native: MIDIAccess}  Native MIDI access to wrap
 */
function Driver(native) {
    var outputs = [], inputs = [], length, i;
    
    EventEmitter.call(this);
    this.native = native;
    
    length = native.outputs.size;

    for (i = 0; i < length; i += 1) {
        outputs[i] = new Output(native.outputs.get(i));
    }

    length = native.inputs.size;

    for (i = 0; i < length; i += 1) {
        inputs[i] = new Input(native.inputs.get(i));
    }
    
    this.outputs = outputs;
    this.output = null;
    this.inputs = inputs;
    this.input = null;
    
    native.onconnect = function (event) {
        var port = event.port;
        
        if (port.type === 'input') {
            port = new Input(port);
            this.inputs.push(port);
        } else {
            port = new Output(port);
            this.outputs.push(port);
        }
        
        this.emit('connect', port);
    }.bind(this);
    
    native.ondisconnect = function (event) {
        var port = event.port;
        
        if (port.type === 'input') {
            port = new Input(port);
            this.inputs = this.inputs.filter(function (input) {
                return (input.native.id !== port.id);
            });
        } else {
            port = new Output(port);
            this.outputs = this.outputs.filter(function (output) {
                return (output.native.id !== port.id);
            });
        }
        
        this.emit('disconnect', port);
    }.bind(this);
}

exports.Driver = Driver;
util.inherits(Driver, EventEmitter);

/**
 * Select input as default input
 *
 * @param {input: string|Input|MIDIInput}  Input id or instance
 */
Driver.prototype.setInput = function (input) {
    if (typeof input === 'number') {
        input = this.inputs.find(function (element) {
            return (element.native.id === input);
        });
    } else if (!input instanceof Input) {
        input = new Input(input);
    }
    
    if (this.input !== null) {
        this.input.removeListener('event', this.transmitMIDIEvent);
    }
    
    this.input = input;
    this.input.on('event', this.transmitMIDIEvent);
};

/**
 * Transmit events from default input
 *
 * @param {event: EventChannel} Event to be transmitted
 */
Driver.prototype.transmitMIDIEvent = function (event) {
    this.emit('event', event);
};

/**
 * Select output as default output
 *
 * @param {input: string|Output|MIDIOutput}    Output id or instance
 */
Driver.prototype.setOutput = function (output) {
    if (typeof output === 'number') {
        output = this.outputs.find(function (element) {
            return (element.native.id === output);
        });
    } else if (!output instanceof Output) {
        output = new Output(output);
    }
    
    this.output = output;
};

/**
 * Send a MIDI event on default output
 *
 * @param {event: EventChannel} Event to be sent
 */
Output.prototype.send = function (event) {
    if (this.input !== null) {
        this.output.send(event);
    }
};
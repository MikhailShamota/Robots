function Message() {

    this.status = null;

    this.event = null;
}

Message.prototype.pack = function() {

    return {

        e:this.event
    };
};

const moment = require('moment');

const common = {};


// random id
common.generateRandomId = () => {
    var rand = Math.floor(Math.random() * 9999) + '';
    var pad = rand.length >= 4 ? rand : new Array(4 - rand.length + 1).join('0') + rand;
    var random_id = moment().format("YYMMDDHHmmss") + pad;
    return parseInt(random_id);
};

// none check
common.isNone = (value) => {
    if (typeof value === 'undefined' || value === null || value === '') {
        return true;
    } else {
        if (value.trim() === '') return true;
        else return false;
    }
};

// 권한 체크
common.isLogined = (session) => {
    if (!session.isLogined || !session.uId || !session.uType) {
        return false;
    }
    return true;
};

// utf8 byte 길이 체크
common.getByteLength = (s) => {
    if(s != undefined && s != "") {
		for(b=i=0;c=s.charCodeAt(i++);b+=c>>11?3:c>>7?2:1);
		return b;
	} else {
		return 0;
	}
};

// JSON parse 체크
common.getJSONList = (list) => {
    try {
        list = JSON.parse(list);
        return list;
    } catch(error) {
        return [];
    }
};

module.exports = common;
const firebase = require('firebase');
const jsonpatch = require('fast-json-patch');

function guessType(value) {
    const number = /^-?\d*\.?\d*$/;
    const boolean = /(true|false)/;

    if (number.test(value)) {
        return Number;
    }

    if (boolean.test(value)) {
        return JSON.parse;
    }
    
    return ((v) => v);
}

function convert(value, type) {
    const typemap = {
        'number': Number,
        'boolean': Boolean,
        'string': String,
    };
    const converter = typemap[type] || guessType(value);
    return converter(value);
}


if (!process.env.FIREBASE_CONFIG) {
    module.exports = { 
        get: () => (console.log(arguments), Promise.resolve()),
        post: () => (console.log(arguments), Promise.resolve()),
        put: () => (console.log(arguments), Promise.resolve()),
        delete: () => (console.log(arguments), Promise.resolve()),
    }
} else {
    const config = JSON.parse(process.env.FIREBASE_CONFIG);
    firebase.initializeApp(config);

    function get(key, orderKey, filterValue, valueType) {
        let ref = firebase.database().ref(key);

        if (orderKey) {
            ref = ref.orderByChild(orderKey);
            if (filterValue !== undefined) {
                ref = ref.equalTo(convert(filterValue, valueType));
            }
        }
        return ref
            .once('value')
            .then(snapshot => {
                if (!orderKey) {
                    return snapshot.val();
                }
                
                const data = [];
                // snapshot.val() forgets any ordering info
                snapshot.forEach(item => {
                    if (item.val()) {
                        data.push(item.val());
                    }
                });
                return data;
            });
    }

    function post(key, data) {
        return firebase
            .database()
            .ref(key)
            .set(data);
    }

    module.exports = {
        get,
        post,

        put: (key, data) =>
            firebase
                .database()
                .ref()
                .update({
                    [key]: data,
                }),

        delete: key =>
            firebase
                .database()
                .ref(key)
                .remove(),

        patch: (key, data, type) => {
            return get(key).then(stored => {
                let patched = null;
                if (type === 'application/json') {
                    patched = Object.assign(stored, data);
                } else if (type === 'application/json-patch+json') {
                    patched = jsonpatch.applyPatch(stored, data).newDocument;
                }
                return post(key, patched);                
            });
        },
    }
}

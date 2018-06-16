const firebase = require('firebase');
const jsonpatch = require('fast-json-patch');

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

    function get(key) {
        return firebase
            .database()
            .ref(key)
            .once('value')
            .then(snapshot => snapshot.val());
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

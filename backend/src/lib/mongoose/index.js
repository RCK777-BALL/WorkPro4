const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

const settings = new Map();
const modelCache = new Map();
let storagePath = null;
let dbName = '';
let host = '';
let connected = false;
let data = {};

function getDataSnapshot() {
  return JSON.parse(JSON.stringify(data, (key, value) => {
    if (value instanceof Date) {
      return { __date: value.toISOString() };
    }
    return value;
  }));
}

function reviveData(snapshot) {
  const revived = {};
  for (const [modelName, collection] of Object.entries(snapshot)) {
    revived[modelName] = {};
    for (const [id, rawDoc] of Object.entries(collection)) {
      revived[modelName][id] = reviveDocument(rawDoc);
    }
  }
  return revived;
}

function reviveDocument(rawDoc) {
  const doc = { ...rawDoc };
  for (const key of Object.keys(doc)) {
    const value = doc[key];
    if (value && typeof value === 'object' && value.__date) {
      doc[key] = new Date(value.__date);
    }
  }
  return doc;
}

async function persist() {
  if (!storagePath) {
    return;
  }

  const snapshot = getDataSnapshot();
  await fs.promises.mkdir(path.dirname(storagePath), { recursive: true });
  await fs.promises.writeFile(storagePath, JSON.stringify(snapshot, null, 2), 'utf8');
}

const connection = {
  get readyState() {
    return connected ? 1 : 0;
  },
  get name() {
    return dbName;
  },
  get host() {
    return host;
  },
  async close() {
    if (!connected) {
      return;
    }
    connected = false;
    await persist();
  },
};

function set(key, value) {
  settings.set(key, value);
  return connection;
}

function parseConnection(uri) {
  try {
    const parsed = new URL(uri);
    const databaseName = parsed.pathname.replace(/^\//, '') || 'default';
    return {
      host: parsed.hostname || 'localhost',
      name: databaseName,
      fileName: `${databaseName}.json`,
    };
  } catch (error) {
    throw new Error(`Invalid Mongo connection string: ${uri}`);
  }
}

async function connect(uri) {
  if (!uri) {
    throw new Error('Connection string required');
  }

  const info = parseConnection(uri);
  host = info.host;
  dbName = info.name;
  storagePath = path.resolve(process.cwd(), 'data', info.fileName);

  try {
    const raw = await fs.promises.readFile(storagePath, 'utf8');
    const snapshot = JSON.parse(raw);
    data = reviveData(snapshot);
  } catch (error) {
    if (error.code === 'ENOENT') {
      data = {};
      await persist();
    } else {
      throw error;
    }
  }

  connected = true;
  return connection;
}

function ensureConnected() {
  if (!connected) {
    throw new Error('Mongoose is not connected');
  }
}

function getCollection(name) {
  ensureConnected();
  if (!data[name]) {
    data[name] = {};
  }
  return data[name];
}

function clone(doc) {
  return {
    ...doc,
    createdAt: doc.createdAt instanceof Date ? new Date(doc.createdAt) : doc.createdAt,
    updatedAt: doc.updatedAt instanceof Date ? new Date(doc.updatedAt) : doc.updatedAt,
  };
}

function matches(doc, query) {
  return Object.entries(query).every(([key, value]) => {
    if (value === undefined) {
      return true;
    }
    return doc[key] === value;
  });
}

class Schema {
  constructor(definition, options = {}) {
    this.definition = definition;
    this.options = options;
  }
}

function applySet(doc, set) {
  if (!set) {
    return;
  }
  Object.entries(set).forEach(([key, value]) => {
    doc[key] = value;
  });
}

function model(name, _schema) {
  if (modelCache.has(name)) {
    return modelCache.get(name);
  }

  class Model {
    static async findOne(query) {
      const collection = getCollection(name);
      for (const doc of Object.values(collection)) {
        if (matches(doc, query)) {
          return clone(doc);
        }
      }
      return null;
    }

    static async findOneAndUpdate(filter, update, options = {}) {
      const collection = getCollection(name);
      let foundEntry = null;
      for (const entry of Object.entries(collection)) {
        if (matches(entry[1], filter)) {
          foundEntry = entry;
          break;
        }
      }

      const now = new Date();
      if (foundEntry) {
        const [id, doc] = foundEntry;
        applySet(doc, update?.$set);
        doc.updatedAt = now;
        collection[id] = doc;
        await persist();
        return clone(doc);
      }

      if (!options.upsert) {
        return null;
      }

      const id = randomUUID();
      const newDoc = {
        _id: id,
        id,
        createdAt: now,
        updatedAt: now,
        ...filter,
      };
      applySet(newDoc, update?.$set);
      collection[id] = newDoc;
      await persist();
      return clone(newDoc);
    }
  }

  modelCache.set(name, Model);
  return Model;
}

const mongoose = {
  connection,
  connect,
  set,
  model,
  Schema,
};

module.exports = mongoose;
module.exports.default = mongoose;
module.exports.connection = connection;
module.exports.connect = connect;
module.exports.model = model;
module.exports.Schema = Schema;
module.exports.set = set;

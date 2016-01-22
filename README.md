# wfs-server

Light and basic WFS server, to broadcast raw vector data from :
* a postgresql database

Full JSON APIs.

## Install

`git clone https://github.com/Dolite/wfs-server.git`
`npm install`

Use node modules

* body-parser
* express
* minimist
* pg
* pg-native
* pg-query

## Run

In the root directory, to use the default configuration file `server.json` :

`node app.js`

To use a specific configuration file :

`node app.js -f /path/to/file.json`

A configuration file have to contain following informations :

```js
{
    "server":{
        "port":1234
    },
    "config":{
        "storedQuerysDir":"./config/queries",
        "layersDir":"./config/layers",
        "datasourcesDir":"./config/datasources"
    }
}

```

If not provided, default max feature count is 500. You can precise a specific number, adding in the server's configuration file :

```js
    "service":{
        "maxFeatureCount":1000
    }
```

## Use

When running, server offer two interfaces : to manage server content, and to consum server broadcasted data

### Admin API

To add data proposed by the server, you have to create datasources (like a postgresql schema), and layers, using datasources.

URL root is : http://localhost:1234/admin/

All service configurations (datasources and layers) are persisted as JSON files (in directories precised in the server configuration).

Admin API allows to :
* view all datasources : GET http://localhost:1234/admin/datasource
* view one datasource : GET http://localhost:1234/admin/datasource/{datasource's name}
* create a new datasource : POST http://localhost:1234/admin/datasource with all needed informations in the body
* delete an existing datasource : DELETE http://localhost:1234/admin/datasource/{datasource's name}
* update a existing datasource : PUT http://localhost:1234/admin/datasource with all needed informations in the body
* same functions for the layer (replace datasource with layer in url)
* reload service configurations from files : PUT http://localhost:1234/admin/reload

Body example for a datasource creation :

```js
{
    "name":"postgres1",
    "connector":{
        "type":"postgresql",
        "dbname":"entrepot",
        "host":"localhost",
        "port":"5432",
        "user":"reader",
        "passwd":"reader"
    }
}
```

Default value : it's possible to provide the `schemaname` in the `connector`, it's 'public' if not

Controls : connection to the database is tested, and tables in the schema are listed (with their geometry column and the srid if exists)

Body example for a layer creation :

```js
{
    "name":"limadm",
    "source":"postgres1",
    "tables":["departements","regions"],
    "maxFeatureCount":13
}
```

Optionnal attribute : maxFeatureCount (if not present, it will be the default value defined in the server configuration file)

Controls : `source` have to be the name of an existing datasource. `tables` will be the available feature type for this layer. Tables' names have to exist in the used datasource.

### WFS API

URL root is : http://localhost:1234/wfs

Only GET requests are allowed. Parameters VERSION and SERVICE are mandatory and only value 2.0.0 and WFS are allowed : http://localhost:1234/wfs?VERSION=2.0.0&SERVICE=WFS

Server is case insensitive.

#### GetCapabilities

To obtain the list of broadcasted data : http://localhost:1234/wfs?VERSION=2.0.0&SERVICE=WFS&REQUEST=GetCapabilities

#### GetFeature

To obtain data :

* Mandatory
    * typeNames : {layer}:{table}, have to be available
* Optionnal
    * count=N : max objects' number in the response. If not defined, the layer's default value will be used
    * featureID=X : only one object will be returned (or none) : the object with a gid equals to X
    * sortBy=attribute(+A|+D)
    * propertyName=attribute1,attribute2
    * srsName=CRS : only EPSG srs are handled
    * bbox=a1,b1,a2,b2

Examples :
* http://localhost:1234/wfs?VERSION=2.0.0&SERVICE=WFS&REQUEST=GetFeature&count=10&sortBy=population+D&typeNames=limadm:departements&properties=name : the 10 most populated departements, only their name
* http://localhost:1234/wfs?VERSION=2.0.0&SERVICE=WFS&REQUEST=GetFeature&typeNames=limadm:departements&bbox=4,45,5,46&srsName=EPSG:4326 : all departements intersected the provided bbox

If layer or feature type is not available, or if asked attributes are not present in source data, a code 400 response is returned.
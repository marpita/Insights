/********************************************************************************
 * Copyright 2017 Cognizant Technology Solutions
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License.  You may obtain a copy
 * of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.  See the
 * License for the specific language governing permissions and limitations under
 * the License.
 ******************************************************************************/
System.register([], function(exports_1) {
    var Neo4jDatasource;
    return {
        setters:[],
        execute: function() {
            ///<reference path="../node_modules/grafana-sdk-mocks/app/headers/common.d.ts" />
            //import angular from 'angular';
            //import _ from 'lodash';
            //import * as dateMath from 'app/core/utils/datemath';
            Neo4jDatasource = (function () {
                /** @ngInject */
                function Neo4jDatasource(instanceSettings, $q, backendSrv, templateSrv) {
                    this.$q = $q;
                    this.backendSrv = backendSrv;
                    this.templateSrv = templateSrv;
                    this.type = instanceSettings.type;
                    this.url = instanceSettings.url;
                    this.name = instanceSettings.name;
                }
                Neo4jDatasource.prototype.addTimestampToQuery = function (query, options) {
                    if (query && options) {
                        var range = options.range;
                        if (range === undefined) {
                            return query;
                        }
                        if (range.from) {
                            var fromTime = range.from.valueOf() / 1000;
                            if (query.indexOf('?START_TIME?') > -1) {
                                query = query.replace(/\?START_TIME\?/g, fromTime.toString());
                            }
                        }
                        if (range.to) {
                            var toTime = range.to.valueOf() / 1000;
                            if (query.indexOf('?END_TIME?') > -1) {
                                query = query.replace(/\?END_TIME\?/g, toTime.toString());
                            }
                        }
                    }
                    return query;
                };
                /*
                  Need to provide following options:
                  1. Consider time interval (5s, 30 mins, 30 hours, etc)
                  2. Provide group by options (group by a result column)
                  3. Table format
                */
                Neo4jDatasource.prototype.processResponse = function (data, options) {
                    var timestamp = new Date().getTime() * 1000;
                    if (options && options.range && options.range.to) {
                        timestamp = options.range.to.valueOf();
                    }
                    var targets = data['targets'];
                    var results = data['results'];
                    var defaultResponse = options ? false : true;
                    var response = [];
                    for (var i in targets) {
                        var target = targets[i];
                        var result = results[i];
                        if (target.timeSeries) {
                            var datapoints = [];
                            var targetResponse = {
                                target: target.refId,
                                datapoints: datapoints
                            };
                            var targetDatapointsMap = {};
                            var rows = result.data;
                            var multiSeriesResponse = false;
                            for (var r in rows) {
                                var row = rows[r].row;
                                if (result.columns.length === 1) {
                                    datapoints.push([row[0], timestamp]);
                                }
                                else if (result.columns.length === 3) {
                                    var targetName = row[2];
                                    var targetDataPoints = targetDatapointsMap[targetName];
                                    if (targetDataPoints === undefined) {
                                        targetDataPoints = [];
                                        targetDatapointsMap[targetName] = targetDataPoints;
                                        response.push({
                                            target: targetName,
                                            datapoints: targetDataPoints
                                        });
                                        multiSeriesResponse = true;
                                    }
                                    targetDataPoints.push([row[1], row[0] * 1000]);
                                }
                                else {
                                    //Assuming the first column will be the time and second column will be the data.
                                    datapoints.push([row[1], row[0] * 1000]);
                                }
                            }
                            if (!multiSeriesResponse) {
                                response.push(targetResponse);
                            }
                        }
                        else if (target.table) {
                            var responseColumns = [];
                            var responseRows = [];
                            var tableResponse = { columns: responseColumns, rows: responseRows, type: "table" };
                            var columns = result.columns;
                            var data_1 = result.data;
                            for (var columnId in columns) {
                                responseColumns.push({ text: columns[columnId] });
                            }
                            var rows = result.data;
                            for (var r in rows) {
                                responseRows.push(rows[r].row);
                            }
                            response.push(tableResponse);
                        }
                        else {
                            defaultResponse = true;
                            break;
                        }
                    }
                    if (defaultResponse) {
                        return data;
                    }
                    return response;
                };
                Neo4jDatasource.prototype.executeCypherQuery = function (cypherQuery, targets, options) {
                    var deferred = this.$q.defer();
                    var self = this;
                    this.backendSrv.datasourceRequest({
                        url: this.url,
                        method: 'POST',
                        data: JSON.stringify(cypherQuery)
                    }).then(function (response) {
                        var data = response.data;
                        if (response.status === 200) {
                            if (data && data.results && data.results.length > 0) {
                                data['targets'] = targets;
                                deferred.resolve({ data: self.processResponse(data, options) });
                            }
                            else {
                                deferred.resolve({ status: "success", message: "No data returned", title: "success" });
                            }
                        }
                        else {
                            deferred.resolve({ status: "failure", message: "Unable to connect to Datasource", title: "Failure" });
                        }
                    });
                    return deferred.promise;
                };
                //let templateName = variable.model.name;
                //Two places where the templates can be used:
                //1. Labels Names
                //2. Where clauseb
                /*const regex = /(match.*where\s?|match\s\(?)(.*)\$LABELS/g;
                    let match = regex.exec(query);
                    if (match && match.length > 2) {
                      let querySegment = match[2];
                      if(querySegment && querySegment.indexOf(' IN ') > -1){
                        return JSON.stringify(value);
                      }
                    }*/
                Neo4jDatasource.prototype.applyTemplateVariables = function (value, variable, formatValue) {
                    if (typeof value === 'string') {
                        var values = [];
                        values.push(value);
                        value = values;
                    }
                    return JSON.stringify(value);
                };
                Neo4jDatasource.prototype.query = function (options) {
                    //var adhocFilters = this.templateSrv.getAdhocFilters(this.name);
                    var targets = options.targets;
                    var cypherQuery = {};
                    var statements = [];
                    cypherQuery['statements'] = statements;
                    for (var i in targets) {
                        var target = targets[i];
                        var query = this.templateSrv.replace(target.target, options.scopedVars, this.applyTemplateVariables);
                        query = this.addTimestampToQuery(query, options);
                        var resultDataContents = [];
                        if (target.graph) {
                            resultDataContents.push("graph");
                        }
                        else {
                            resultDataContents.push("row");
                        }
                        var statement = {
                            "statement": query,
                            "includeStats": target.stats,
                            "resultDataContents": resultDataContents
                        };
                        statements.push(statement);
                    }
                    return this.executeCypherQuery(cypherQuery, targets, options);
                };
                Neo4jDatasource.prototype.annotationQuery = function (options) {
                };
                Neo4jDatasource.prototype.metricFindQuery = function (query) {
                    var cypherQuery = {};
                    var statements = [];
                    cypherQuery['statements'] = statements;
                    query = this.addTimestampToQuery(query, null);
                    query = this.templateSrv.replace(query, {}, this.applyTemplateVariables);
                    var resultDataContents = ["row"];
                    var statement = {
                        "statement": query,
                        "includeStats": false,
                        "resultDataContents": resultDataContents
                    };
                    statements.push(statement);
                    var deferred = this.$q.defer();
                    var isResolved = false;
                    this.executeCypherQuery(cypherQuery, null, null).then(function (response) {
                        if (response && response.data && response.data.results) {
                            var result = response.data.results[0];
                            if (result) {
                                var data = result.data;
                                if (data) {
                                    var metrics = [];
                                    for (var _i = 0; _i < data.length; _i++) {
                                        var row = data[_i];
                                        var record = row.row;
                                        if (record && record.length > 0) {
                                            metrics.push({ text: record[0], value: record[0] });
                                        }
                                    }
                                    deferred.resolve(metrics);
                                    isResolved = true;
                                }
                            }
                        }
                        if (!isResolved) {
                            deferred.resolve([]);
                        }
                    });
                    return deferred.promise;
                };
                Neo4jDatasource.prototype.testDatasource = function () {
                    var queryJson = {
                        "statements": [
                            {
                                "statement": "match (n) return n limit 1",
                                "includeStats": true,
                                "resultDataContents": ["row", "graph"]
                            }
                        ]
                    };
                    var testQuery = JSON.stringify(queryJson);
                    var deferred = this.$q.defer();
                    //var self = this;
                    try {
                        this.backendSrv.datasourceRequest({
                            url: this.url,
                            method: 'POST',
                            data: testQuery
                        }).then(function (response) {
                            var data = response.data;
                            if (response.status === 200) {
                                if (data && data.results.length > 0) {
                                    deferred.resolve({ status: "success", message: "Data source is working", title: "Success" });
                                }
                                else {
                                    deferred.resolve({ status: "failure", message: "No data returned", title: "failure" });
                                }
                            }
                            else {
                                deferred.resolve({ status: "failure", message: "Unable to connect to Datasource", title: "Failure" });
                            }
                        });
                    }
                    catch (error) {
                        deferred.resolve({ status: "failure", message: "Unable to connect to Datasource", title: "Failure" });
                    }
                    return deferred.promise;
                };
                return Neo4jDatasource;
            })();
            exports_1("default", Neo4jDatasource);
        }
    }
});
//# sourceMappingURL=datasource.js.map
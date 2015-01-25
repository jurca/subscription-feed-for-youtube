
if (!(Array.prototype.includes instanceof Function)) {
  Array.prototype.includes = function (searchElement, fromIndex) {
    return this.indexOf(searchElement, fromIndex || 0) > -1;
  };
}

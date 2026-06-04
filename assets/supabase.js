/* ── Supabase client — Suks & Giu System ── */
var SGS_SUPABASE_URL  = 'https://cckalvgublrqkacljymz.supabase.co';
var SGS_SUPABASE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNja2Fsdmd1YmxycWthY2xqeW16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2MDA1NTYsImV4cCI6MjA5NjE3NjU1Nn0.v9SFstg90NWhNd0H9aFAt-6uEiz5riDIlnWb_LbqPB8';

/* Minimal Supabase REST client (no npm needed) */
var db = (function(){
  var url = SGS_SUPABASE_URL;
  var key = SGS_SUPABASE_KEY;

  function headers() {
    return {
      'apikey': key,
      'Authorization': 'Bearer ' + key,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };
  }

  function req(method, path, body) {
    return fetch(url + '/rest/v1/' + path, {
      method: method,
      headers: headers(),
      body: body ? JSON.stringify(body) : undefined
    }).then(function(r) {
      if (!r.ok) return r.text().then(function(t){ throw new Error(t); });
      var ct = r.headers.get('content-type')||'';
      return ct.indexOf('json') !== -1 ? r.json() : r.text().then(function(){ return null; });
    });
  }

  return {
    /* SELECT */
    from: function(table) {
      var _table = table;
      var _filters = [];
      var _order = null;
      var _limit = null;

      var q = {
        eq: function(col, val) { _filters.push(col + '=eq.' + encodeURIComponent(val)); return q; },
        neq: function(col, val) { _filters.push(col + '=neq.' + encodeURIComponent(val)); return q; },
        order: function(col, opts) { _order = col + (opts&&opts.ascending===false?'.desc':'.asc'); return q; },
        limit: function(n) { _limit = n; return q; },
        select: function(cols) {
          var qs = 'select=' + (cols||'*');
          if (_filters.length) qs += '&' + _filters.join('&');
          if (_order) qs += '&order=' + _order;
          if (_limit) qs += '&limit=' + _limit;
          return req('GET', _table + '?' + qs);
        },
        insert: function(data) {
          return req('POST', _table, Array.isArray(data)?data:[data]);
        },
        update: function(data) {
          var qs = _filters.length ? '?' + _filters.join('&') : '';
          return req('PATCH', _table + qs, data);
        },
        upsert: function(data) {
          return fetch(url + '/rest/v1/' + _table, {
            method: 'POST',
            headers: Object.assign({}, headers(), {'Prefer': 'return=representation,resolution=merge-duplicates'}),
            body: JSON.stringify(Array.isArray(data)?data:[data])
          }).then(function(r){ return r.ok ? r.json() : r.text().then(function(t){ throw new Error(t); }); });
        },
        delete: function() {
          var qs = _filters.length ? '?' + _filters.join('&') : '';
          return req('DELETE', _table + qs);
        }
      };
      return q;
    }
  };
}());

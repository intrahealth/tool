const axios = require('axios')
const async = require('async')

let url = 'http://localhost:8081/hapi_kenya/fhir/PractitionerRole'
let bundle = {};
bundle.entry = [];
bundle.type = 'batch';
bundle.resourceType = 'Bundle';
async.whilst(
  callback => {
    return callback(null, url !== false);
  },
  callback => {
    axios.get(url, {
      headers: {
        'Cache-Control': 'no-cache',
      },
      withCredentials: true,
      auth: {
        username: '',
        password: ''
      },
    }).then((response) => {
      const promises = []
      if(!response.data.entry || response.data.entry.length === 0) {
        url = false
        return callback(null, false);
      }
      for(let res of response.data.entry) {
        promises.push(new Promise((resolve) => {
          let updated = false
          for(let codeIndex in res.resource.code) {
            for(let codingIndex in res.resource.code[codeIndex].coding) {
              if(!res.resource.code[codeIndex].coding[codingIndex].code) {
                continue
              }
              if(res.resource.code[codeIndex].coding[codingIndex].code.startsWith('job|')) {
                updated = true
                res.resource.code[codeIndex].coding[codingIndex].system = 'http://ihris.org/fhir/CodeSystem/ihris-job'
                if(res.resource.code[codeIndex].text) {
                  res.resource.code[codeIndex].coding[codingIndex].display = res.resource.code[codeIndex].text
                }
              }
            }
          }
          if(updated) {
            bundle.entry.push({
              resource: res.resource,
              request: {
                method: 'PUT',
                url: res.resource.resourceType + '/' + res.resource.id,
              },
            })
          }
          return resolve()
        }))
      }
      Promise.all(promises).then(() => {
        url = false
        const next = response.data.link && response.data.link.find(link => link.relation === 'next');
        if (next) {
          url = next.url;
        }
        console.log(bundle.entry.length);
        if(bundle.entry.length >= 200) {
          const url = 'http://localhost:8081/hapi_kenya/fhir';
          axios({
            method: 'POST',
            url,
            auth: {
              username: '',
              password: ''
            },
            data: bundle
          })
          .then(() => {
            bundle.entry = []
            console.log('Saved');
            return callback(null, url);
          }).catch((err) => {
            console.log(err);
            return callback(null, url);
          })
        } else {
          return callback(null, url);
        }
      }).catch((err) => {
        console.log(err);
        return callback(null, url);
      })
    })
  },
  err => {
    console.log(bundle.entry.length);
    if(bundle.entry.length > 0) {
      const url = 'http://localhost:8081/hapi_kenya/fhir';
      axios({
        method: 'POST',
        url,
        auth: {
          username: '',
          password: ''
        },
        data: bundle
      })
      .then(() => {
        bundle.entry = []
        console.log('Saved and Done');
      }).catch((err) => {
        console.log(err);
      })
    }
  }
)
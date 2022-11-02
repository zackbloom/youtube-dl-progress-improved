const youtubedl = require('youtube-dl-exec')
const ProgressPromise = require('progress-promise')
const Split = require('stream-split')

const DEBUG = false

// These control characters are used by the YouTube-DL CLI between progress
// updates to overwrite the last message. Due to poor decision making by that
// team, no option is offered to print progress in a machine readable, or even
// sanely loggable, format.
//
// A progress update looks like this:
// ^M^[[K[download]   0.0% of 7.09MiB at 351.11KiB/s ETA 00:20
//
const newSplitter = () => new Split(Buffer.from("0d", "hex"))
const progressRE = /\[download\] +(?<percentage>[\d\.]+)% +of +~? *(?<totalSize>[\d\.]+)(?<sizeUnit>\w{1,3}) +at +(?<rate>[\d\.]+)(?<rateUnit>[\w\/]+) +ETA +(?<timeRemaining>[\d:]+)/

let sizeUnits = {
  'B': 1,
  'KiB': 1024,
  'MiB': 1024 * 1024,
  'GiB': 1024 * 1024 * 1024,
}

// Options
//
// timeout - The timeout in milliseconds to wait for the download to complete.
//
function download(url, args={}, options={}) {
  const subprocess = youtubedl.exec(url, args)

  const promise = new ProgressPromise((resolve, reject, progress) => {
    const splitter = newSplitter()

    splitter.on('data', (chunk) => {
      if (DEBUG) {
        console.log("Splitter chunk", chunk.toString())
      }

      const match = progressRE.exec(chunk.toString())
      if (match) {
        if (DEBUG) {
          console.log("Got match", match)
        }

        let { percentage, totalSize, sizeUnit, rate, rateUnit, timeRemaining } = match.groups

        totalSize = parseFloat(totalSize)
        rate = parseFloat(rate)
        percentage = parseFloat(percentage)

        /* What these values look like:
          {
            percentage: 2.9,
            totalSize: 51.88,
            sizeUnit: 'MiB',
            rate: 300.95,
            rateUnit: 'KiB/s',
            timeRemaining: '02:51'
          }
        */

        const totalSizeBytes = totalSize * sizeUnits[sizeUnit]
        const rateBytesPerSecond = rate * sizeUnits[rateUnit.slice(0, -2)]
        const timeRemainingSeconds = parseFloat(timeRemaining.split(':').reduce((acc, val) => acc * 60 + parseInt(val), 0))

        progress({
          percentage,
          totalSize,
          sizeUnit,
          totalSizeBytes,
          rate,
          rateUnit,
          rateBytesPerSecond,
          timeRemaining,
          timeRemainingSeconds,
        })
      }
    })

    subprocess.stdout.on('data', (data) => splitter.write(data))

    let errBody = ''
    subprocess.stderr.on('data', (data) => {
      if (DEBUG) {
        console.log(data.toString())
      }

      errBody += data.toString()
    })

    subprocess.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(errBody || (code === null ? `Timeout` : `Status code: ${ code }`)))
      }
    })

    if (options.timeout) {
      setTimeout(subprocess.cancel, options.timeout)
    }
  })

  promise.cancel = () => {
    promise.cancelled = true
    subprocess.kill()
  }

  return promise
}

module.exports = { download }

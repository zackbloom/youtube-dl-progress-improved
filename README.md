# An Improved Node.js Wrapper for YoutubeDL

[youtubedl-dl](https://github.com/ytdl-org/youtube-dl) conventionally makes it very hard to get progress information on the status of a download. This module
implements a new function `download` which returns a `ProgressPromise`. This promise allows you to get the
status of the download, but also implements a `progress` method for you to be informed of the file's size and
download progress.

### Arguments

See [youtube-dl-exec](https://github.com/microlinkhq/youtube-dl-exec/blob/183831c971004f592f443f966bcc7695e20ba833/src/index.d.ts#L93)
for a listing of the arguments which can be passed to youtube-dl.

### Options

We also accept an options object which only has a single option at the moment:

- `timeout`: How many ms after which we should abort the download. Set to false to never timeout.

### Example

```javascript

const { download } = require('youtube-dl-progress-improved')

const promise = download("https://www.youtube.com/watch?v=dQw4w9WgXcQ", {
  format: 'bestvideo[height <=? 480]+bestaudio/best[height <=? 480]',
}, {
  timeout: 60 * 1000,
})

promise.progress((value) => {
  console.log(value.percentage, value.totalSizeBytes, value.timeRemainingSeconds, value.rateBytesPerSecond)
})

promise.then(() => {
  console.log("Download completed")
}, (err) => {
  console.error("Error downloading", err)
})

// You can cancel a download:
promise.cancel()

// A cancelled download will reject, but `promise.cancelled` will be true
```

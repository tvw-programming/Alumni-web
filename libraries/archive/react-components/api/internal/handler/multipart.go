package handler

import "mime/multipart"

// multipartHeader is an alias so the handler signature reads without dragging
// `mime/multipart` through every call site.
type multipartHeader = multipart.FileHeader

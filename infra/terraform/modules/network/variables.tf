variable "project_id" {
  type = string
}

variable "region" {
  type = string
}

variable "name_prefix" {
  description = "Prefix for all resource names in this module, e.g. \"support-me-prod\"."
  type        = string
}

variable "subnet_cidr" {
  type    = string
  default = "10.10.0.0/20"
}

variable "pods_cidr" {
  type    = string
  default = "10.20.0.0/14"
}

variable "services_cidr" {
  type    = string
  default = "10.30.0.0/20"
}

# aws_lb_target_group

Provides a Target Group resource for use with Load Balancer resources.

## input variables

| Name | Description | Type | Default | Required |
|------|-------------|:----:|:-----:|:-----:|
|account_id|The id of AWS account.|string||Yes|
|region|This is the AWS region.|string|us-east-1|Yes|
|lb_target_group_name|The name of the target group. If omitted, Terraform will assign a random, unique name.|string|{{name}}|No|
|lb_target_group_port|The port on which targets receive traffic, unless overridden when registering a specific target.|number|80|No|
|lb_target_group_protocol|The protocol to use for routing traffic to the targets.|string|HTTP|No|
|lb_target_group_vpc_id|The identifier of the VPC in which to create the target group.|string||Yes|
|lb_target_group_deregistration_delay|The amount time for Elastic Load Balancing to wait before changing the state of a deregistering target from draining to unused. The range is 0-3600 seconds.|number|300|No|
|lb_target_group_slow_start|The amount time for targets to warm up before the load balancer sends them a full share of requests. The range is 30-900 seconds or 0 to disable.|number|0|No|
|lb_target_group_proxy_protocol_v2|Boolean to enable / disable support for proxy protocol v2 on Network Load Balancers.|boolean|false|No|
|lb_target_group_type|The type of sticky sessions. The only current possible value is lb_cookie.|string|lb_cookie|No|
|lb_target_group_cookie_duration|The time period, in seconds, during which requests from a client should be routed to the same target. After this time period expires, the load balancer-generated cookie is considered stale. The range is 1 second to 1 week (604800 seconds).|number|86400|No|
|lb_target_group_enabled|Boolean to enable / disable stickiness.|boolean|true|No|
|lb_target_group_health_check_interval|The approximate amount of time, in seconds, between health checks of an individual target. Minimum value 5 seconds, Maximum value 300 seconds.|numebr|30|No|
|lb_target_group_health_check_path|The destination for the health check request. Applies to Application Load Balancers only (HTTP/HTTPS), not Network Load Balancers (TCP).|string||Yes|
|lb_target_group_health_check_port|The port to use to connect with the target. Valid values are either ports 1-65536, or traffic-port. |string|80|No|
|lb_target_group_health_check_protocol|The protocol to use to connect with the target.|string|HTTP|No|
|lb_target_group_health_check_timeout|The amount of time, in seconds, during which no response means a failed health check. For Application Load Balancers, the range is 2 to 60 seconds and the default is 5 seconds. For Network Load Balancers, you cannot set a custom value, and the default is 10 seconds for TCP and HTTPS health checks and 6 seconds for HTTP health checks.|number|6|No|
|lb_target_group_healthy_threshold|The number of consecutive health checks successes required before considering an unhealthy target healthy.|number|3|No|
|lb_target_group_unhealthy_threshold|The number of consecutive health check failures required before considering the target unhealthy . For Network Load Balancers, this value must be the same as the healthy_threshold.|number|3|No|
|custom_tags|Custom tags.|map||No|
|default_tags|Default tags.|map|{"ThubName"= "{{ name }}","ThubCode"= "{{ code }}","ThubEnv"= "default","Description" = "Managed by TerraHub"}|No|

## output parameters

| Name | Description | Type |
|------|-------------|:----:|
|id|The ARN of the Target Group (matches arn).|string|
|arn|The ARN of the Target Group (matches id).|string|
|arn_suffix|The ARN suffix for use with CloudWatch Metrics.|string|
|name|The name of the Target Group.|string|
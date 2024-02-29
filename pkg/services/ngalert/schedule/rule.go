package schedule

import (
	context "context"

	"github.com/grafana/grafana/pkg/util"
)

type Rule struct {
	evalCh   chan *evaluation
	updateCh chan ruleVersionAndPauseStatus
	ctx      context.Context
	cancelFn util.CancelCauseFunc
}

func newAlertRuleInfo(parent context.Context) *Rule {
	ctx, stop := util.WithCancelCause(parent)
	return &Rule{evalCh: make(chan *evaluation), updateCh: make(chan ruleVersionAndPauseStatus), ctx: ctx, cancelFn: stop}
}

// eval signals the rule evaluation routine to perform the evaluation of the rule. Does nothing if the loop is stopped.
// Before sending a message into the channel, it does non-blocking read to make sure that there is no concurrent send operation.
// Returns a tuple where first element is
//   - true when message was sent
//   - false when the send operation is stopped
//
// the second element contains a dropped message that was sent by a concurrent sender.
func (a *Rule) eval(eval *evaluation) (bool, *evaluation) {
	// read the channel in unblocking manner to make sure that there is no concurrent send operation.
	var droppedMsg *evaluation
	select {
	case droppedMsg = <-a.evalCh:
	default:
	}

	select {
	case a.evalCh <- eval:
		return true, droppedMsg
	case <-a.ctx.Done():
		return false, droppedMsg
	}
}

// update sends an instruction to the rule evaluation routine to update the scheduled rule to the specified version. The specified version must be later than the current version, otherwise no update will happen.
func (a *Rule) update(lastVersion ruleVersionAndPauseStatus) bool {
	// check if the channel is not empty.
	select {
	case <-a.updateCh:
	case <-a.ctx.Done():
		return false
	default:
	}

	select {
	case a.updateCh <- lastVersion:
		return true
	case <-a.ctx.Done():
		return false
	}
}

func (a *Rule) stop(reason error) {
	a.cancelFn(reason)
}

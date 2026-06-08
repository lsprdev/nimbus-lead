package backend

import "testing"

func TestCompletionStatusCompletedWhenRequestedTotalIsReached(t *testing.T) {
	status, message := completionStatus(10, 10)

	if status != statusCompleted {
		t.Fatalf("expected completed status, got %q", status)
	}
	if message != "" {
		t.Fatalf("expected empty message, got %q", message)
	}
}

func TestCompletionStatusPartialWhenSearchStopsBeforeRequestedTotal(t *testing.T) {
	status, message := completionStatus(3, 10)

	if status != statusPartial {
		t.Fatalf("expected partial status, got %q", status)
	}
	if message != "Busca encerrada com 3 de 10 contatos solicitados." {
		t.Fatalf("unexpected partial message: %q", message)
	}
}

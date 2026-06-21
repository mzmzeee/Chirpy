package auth

import (
	"testing"
	"time"

	"github.com/google/uuid"
)

func TestMakeJWTAndValidateJWT(t *testing.T) {
	secret := "test-secret-key"
	userID := uuid.New()

	tokenString, err := MakeJWT(userID, secret, time.Hour)
	if err != nil {
		t.Fatalf("MakeJWT failed: %v", err)
	}
	if tokenString == "" {
		t.Fatal("MakeJWT returned empty token")
	}

	// Validate should return the same user ID
	gotID, err := ValidateJWT(tokenString, secret)
	if err != nil {
		t.Fatalf("ValidateJWT failed: %v", err)
	}
	if gotID != userID {
		t.Errorf("ValidateJWT returned wrong user ID: got %v, want %v", gotID, userID)
	}
}

func TestExpiredJWTIsRejected(t *testing.T) {
	secret := "test-secret-key"
	userID := uuid.New()

	// Create a token that expired 1 hour ago
	tokenString, err := MakeJWT(userID, secret, -time.Hour)
	if err != nil {
		t.Fatalf("MakeJWT failed: %v", err)
	}

	_, err = ValidateJWT(tokenString, secret)
	if err == nil {
		t.Error("ValidateJWT should reject expired token, got nil error")
	}
}

func TestWrongSecretIsRejected(t *testing.T) {
	userID := uuid.New()

	// Sign with one secret, validate with another
	tokenString, err := MakeJWT(userID, "correct-secret", time.Hour)
	if err != nil {
		t.Fatalf("MakeJWT failed: %v", err)
	}

	_, err = ValidateJWT(tokenString, "wrong-secret")
	if err == nil {
		t.Error("ValidateJWT should reject token signed with wrong secret, got nil error")
	}
}

func TestInvalidTokenString(t *testing.T) {
	_, err := ValidateJWT("not-a-real-token", "secret")
	if err == nil {
		t.Error("ValidateJWT should reject invalid token string, got nil error")
	}
}

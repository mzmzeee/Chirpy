package main

import (
	"encoding/json"
	"net/http"
	"strings"
)

func respondWithError(w http.ResponseWriter, code int, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	dat, _ := json.Marshal(map[string]string{"error": msg})
	w.Write(dat)
}

func respondWithJSON(w http.ResponseWriter, code int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	dat, _ := json.Marshal(payload)
	w.Write(dat)
}

func cleanChirpText(text string) string {
	words := strings.Split(text, " ")

	for i, word := range words {
		lowercased := strings.ToLower(word)

		if lowercased == "kerfuffle" || lowercased == "sharbert" || lowercased == "fornax" {
			words[i] = "****"
		}
	}

	return strings.Join(words, " ")
}
